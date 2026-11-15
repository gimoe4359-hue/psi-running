#!/usr/bin/env python3
"""A small Luau parser + scope checker for the game scripts (no Roblox Studio needed).

It understands the subset of Luau these scripts are written in (no type annotations) and reports
  * syntax errors
  * names that are read or written without being declared (typos, or a local function used before it is defined)
and prints the member names used after ':' so API typos can be spotted by eye.

    python3 luacheck.py lua/*.lua
"""
import re
import sys

KEYWORDS = {'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in', 'local', 'nil', 'not', 'or',
            'repeat', 'return', 'then', 'true', 'until', 'while', 'continue'}
GLOBALS = {'game', 'workspace', 'script', 'Instance', 'Vector3', 'Vector2', 'CFrame', 'Color3', 'UDim', 'UDim2', 'Enum', 'task', 'math',
           'string', 'table', 'os', 'tick', 'print', 'warn', 'error', 'pcall', 'xpcall', 'ipairs', 'pairs', 'next', 'tostring',
           'tonumber', 'type', 'typeof', 'require', 'select', 'unpack', 'setmetatable', 'getmetatable', 'rawget', 'rawset',
           'assert', 'TweenInfo', 'RaycastParams', 'OverlapParams', 'Random', 'NumberSequence', 'NumberSequenceKeypoint',
           'ColorSequence', 'NumberRange', 'BrickColor', 'Rect', 'utf8', 'coroutine', '_G', 'time', 'DateTime'}
TOKEN = re.compile(r'''
    (?P<ws>\s+)
  | (?P<comment>--\[(?P<ceq>=*)\[.*?\](?P=ceq)\]|--[^\n]*)
  | (?P<lstr>\[(?P<seq>=*)\[.*?\](?P=seq)\])
  | (?P<str>"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')
  | (?P<num>0[xX][0-9a-fA-F_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>\.\.\.|\.\.=|\.\.|==|~=|<=|>=|\+=|-=|\*=|/=|%=|\^=|//|::|[-+*/%^\#<>=(){}\[\];:,.])
''', re.S | re.X)

BINPRI = {'or': (1, 1), 'and': (2, 2), '<': (3, 3), '>': (3, 3), '<=': (3, 3), '>=': (3, 3), '~=': (3, 3), '==': (3, 3),
          '..': (9, 8), '+': (10, 10), '-': (10, 10), '*': (11, 11), '/': (11, 11), '//': (11, 11), '%': (11, 11), '^': (14, 13)}
UNARY_PRI = 12


class LuaError(Exception):
    pass


class Checker:
    def __init__(self, src, name):
        self.name = name
        self.toks = []
        pos, line = 0, 1
        while pos < len(src):
            m = TOKEN.match(src, pos)
            if not m:
                raise LuaError('%s:%d: unexpected character %r' % (name, line, src[pos]))
            kind = m.lastgroup
            text = m.group(0)
            if kind in ('ceq', 'seq'):
                kind = 'comment' if m.group('comment') else 'lstr'
            if m.group('comment') is not None:
                kind = 'comment'
            elif m.group('lstr') is not None:
                kind = 'str'
            elif m.group('ws') is not None:
                kind = 'ws'
            elif m.group('str') is not None:
                kind = 'str'
            elif m.group('num') is not None:
                kind = 'num'
            elif m.group('name') is not None:
                kind = 'kw' if text in KEYWORDS else 'name'
            else:
                kind = 'op'
            if kind not in ('ws', 'comment'):
                self.toks.append((kind, text, line))
            line += text.count('\n')
            pos = m.end()
        self.toks.append(('eof', '<eof>', line))
        self.i = 0
        self.scopes = [set()]
        self.problems = []
        self.members = set()
        self.loop = 0

    # ---- token helpers
    def peek(self, k=0):
        return self.toks[min(self.i + k, len(self.toks) - 1)]

    def at(self, text):
        t = self.peek()
        return t[1] == text and t[0] in ('kw', 'op')

    def take(self, text=None):
        t = self.peek()
        if text is not None and not (t[1] == text and t[0] in ('kw', 'op')):
            raise LuaError('%s:%d: expected %r near %r' % (self.name, t[2], text, t[1]))
        self.i += 1
        return t

    def take_name(self):
        t = self.peek()
        if t[0] != 'name':
            raise LuaError('%s:%d: expected a name near %r' % (self.name, t[2], t[1]))
        self.i += 1
        return t[1]

    # ---- scopes
    def declare(self, n):
        self.scopes[-1].add(n)

    def known(self, n):
        return n in GLOBALS or any(n in s for s in self.scopes)

    def use(self, n, line, write=False):
        if not self.known(n):
            self.problems.append('%s:%d: %s undeclared name %r' % (self.name, line, 'assignment to' if write else 'use of', n))

    # ---- statements
    def block(self, enders=('end',), new_scope=True):
        if new_scope:
            self.scopes.append(set())
        while True:
            t = self.peek()
            if t[0] == 'eof' or (t[0] == 'kw' and t[1] in enders):
                break
            if self.at('return'):
                self.take()
                t = self.peek()
                if not (t[0] == 'eof' or (t[0] == 'kw' and t[1] in enders) or self.at(';')):
                    self.exprlist()
                if self.at(';'):
                    self.take()
                t = self.peek()
                if not (t[0] == 'eof' or (t[0] == 'kw' and t[1] in enders)):
                    raise LuaError('%s:%d: statement after return' % (self.name, t[2]))
                break
            self.statement()
        if new_scope:
            self.scopes.pop()

    def statement(self):
        t = self.peek()
        if self.at(';'):
            self.take()
        elif self.at('if'):
            self.take()
            self.expr()
            self.take('then')
            self.block(('elseif', 'else', 'end'))
            while self.at('elseif'):
                self.take()
                self.expr()
                self.take('then')
                self.block(('elseif', 'else', 'end'))
            if self.at('else'):
                self.take()
                self.block(('end',))
            self.take('end')
        elif self.at('while'):
            self.take()
            self.expr()
            self.take('do')
            self.loop += 1
            self.block()
            self.loop -= 1
            self.take('end')
        elif self.at('do'):
            self.take()
            self.block()
            self.take('end')
        elif self.at('for'):
            self.take()
            names = [self.take_name()]
            if self.at('='):
                self.take()
                self.expr()
                self.take(',')
                self.expr()
                if self.at(','):
                    self.take()
                    self.expr()
            else:
                while self.at(','):
                    self.take()
                    names.append(self.take_name())
                self.take('in')
                self.exprlist()
            self.take('do')
            self.scopes.append(set(names))
            self.loop += 1
            self.block(new_scope=False)
            self.loop -= 1
            self.scopes.pop()
            self.take('end')
        elif self.at('repeat'):
            self.take()
            self.scopes.append(set())
            self.loop += 1
            self.block(('until',), new_scope=False)
            self.loop -= 1
            self.take('until')
            self.expr()
            self.scopes.pop()
        elif self.at('function'):
            self.take()
            line = self.peek()[2]
            n = self.take_name()
            method = False
            if self.at('.') or self.at(':'):
                self.use(n, line)
                while self.at('.'):
                    self.take()
                    self.take_name()
                if self.at(':'):
                    self.take()
                    self.take_name()
                    method = True
            else:
                self.use(n, line, write=True)
            self.funcbody(method)
        elif self.at('local'):
            self.take()
            if self.at('function'):
                self.take()
                n = self.take_name()
                self.declare(n)
                self.funcbody(False)
            else:
                names = [self.take_name()]
                while self.at(','):
                    self.take()
                    names.append(self.take_name())
                if self.at('='):
                    self.take()
                    self.exprlist()
                for n in names:
                    self.declare(n)
        elif self.at('break') or self.at('continue'):
            if not self.loop:
                raise LuaError('%s:%d: %s outside a loop' % (self.name, t[2], t[1]))
            self.take()
        else:
            # assignment or call
            kind = self.suffixed(target=True)
            if self.at('=') or self.at(','):
                if kind == 'call':
                    raise LuaError('%s:%d: cannot assign to a call' % (self.name, t[2]))
                while self.at(','):
                    self.take()
                    if self.suffixed(target=True) == 'call':
                        raise LuaError('%s:%d: cannot assign to a call' % (self.name, t[2]))
                self.take('=')
                self.exprlist()
            elif self.peek()[1] in ('+=', '-=', '*=', '/=', '%=', '^=', '..=') and self.peek()[0] == 'op':
                if kind == 'call':
                    raise LuaError('%s:%d: cannot assign to a call' % (self.name, t[2]))
                self.take()
                self.expr()
            elif kind != 'call':
                raise LuaError('%s:%d: expression is not a statement near %r' % (self.name, t[2], self.peek()[1]))

    def funcbody(self, method):
        self.take('(')
        params = set(['self']) if method else set()
        if not self.at(')'):
            while True:
                if self.at('...'):
                    self.take()
                    params.add('...')
                    break
                params.add(self.take_name())
                if not self.at(','):
                    break
                self.take()
        self.take(')')
        self.scopes.append(params)
        saved, self.loop = self.loop, 0
        self.block(new_scope=False)
        self.loop = saved
        self.scopes.pop()
        self.take('end')

    # ---- expressions
    def exprlist(self):
        self.expr()
        while self.at(','):
            self.take()
            self.expr()

    def expr(self, limit=0):
        t = self.peek()
        if (t[0] == 'kw' and t[1] == 'not') or (t[0] == 'op' and t[1] in ('-', '#')):
            self.take()
            self.expr(UNARY_PRI)
        else:
            self.simple()
        while True:
            t = self.peek()
            op = t[1] if t[0] in ('op', 'kw') else None
            if op not in BINPRI or BINPRI[op][0] <= limit:
                break
            self.take()
            self.expr(BINPRI[op][1])

    def simple(self):
        t = self.peek()
        if t[0] in ('num', 'str'):
            self.take()
            if t[0] == 'str' and (self.at(':') or self.at('.')):
                raise LuaError('%s:%d: index a string literal with parentheses' % (self.name, t[2]))
        elif t[0] == 'kw' and t[1] in ('nil', 'true', 'false'):
            self.take()
        elif self.at('...'):
            self.take()
            if not any('...' in s for s in self.scopes):
                self.problems.append('%s:%d: ... outside a vararg function' % (self.name, t[2]))
        elif self.at('{'):
            self.table()
        elif self.at('function'):
            self.take()
            self.funcbody(False)
        elif self.at('if'):
            self.take()
            self.expr()
            self.take('then')
            self.expr()
            while self.at('elseif'):
                self.take()
                self.expr()
                self.take('then')
                self.expr()
            self.take('else')
            self.expr()
        else:
            self.suffixed()

    def table(self):
        self.take('{')
        while not self.at('}'):
            if self.at('['):
                self.take()
                self.expr()
                self.take(']')
                self.take('=')
                self.expr()
            elif self.peek()[0] == 'name' and self.peek(1)[1] == '=' and self.peek(1)[0] == 'op':
                self.take()
                self.take()
                self.expr()
            else:
                self.expr()
            if self.at(',') or self.at(';'):
                self.take()
            elif not self.at('}'):
                t = self.peek()
                raise LuaError('%s:%d: expected , or } in table near %r' % (self.name, t[2], t[1]))
        self.take('}')

    def suffixed(self, target=False):
        """primary expression followed by .name [exp] :name(args) (args). Returns 'call', 'index' or 'name'."""
        t = self.peek()
        kind = 'name'
        root = None
        if t[0] == 'name':
            self.take()
            root = t
        elif self.at('('):
            self.take()
            self.expr()
            self.take(')')
            kind = 'paren'
        else:
            raise LuaError('%s:%d: unexpected %r' % (self.name, t[2], t[1]))
        first = True
        while True:
            n = self.peek()
            if self.at('.'):
                self.take()
                self.take_name()
                kind = 'index'
            elif self.at('['):
                self.take()
                self.expr()
                self.take(']')
                kind = 'index'
            elif self.at(':'):
                self.take()
                self.members.add(self.take_name())
                self.args()
                kind = 'call'
            elif self.at('(') or n[0] == 'str' or self.at('{'):
                if self.at('(') and n[2] != self.toks[self.i - 1][2]:
                    self.problems.append('%s:%d: ambiguous call — "(" starts a new line' % (self.name, n[2]))
                self.args()
                kind = 'call'
            else:
                break
            if first and root is not None:
                self.use(root[1], root[2])
                root = None
            first = False
        if root is not None:
            # a bare name: reading it, or assigning to it
            nxt = self.peek()
            is_write = target and nxt[0] == 'op' and nxt[1] in ('=', ',')
            self.use(root[1], root[2], write=is_write)
        return kind

    def args(self):
        t = self.peek()
        if t[0] == 'str':
            self.take()
        elif self.at('{'):
            self.table()
        else:
            self.take('(')
            if not self.at(')'):
                self.exprlist()
            self.take(')')


def check(path):
    with open(path, encoding='utf-8') as fh:
        src = fh.read()
    c = Checker(src, path.split('/')[-1])
    c.block(())
    if c.peek()[0] != 'eof':
        t = c.peek()
        raise LuaError('%s:%d: unexpected %r' % (c.name, t[2], t[1]))
    return c


def main(paths):
    bad = 0
    members = set()
    for p in paths:
        try:
            c = check(p)
        except LuaError as e:
            print('SYNTAX', e)
            bad += 1
            continue
        for pr in c.problems:
            print('SCOPE ', pr)
        bad += len(c.problems)
        members |= c.members
        print('ok    %s (%d tokens)' % (p.split('/')[-1], len(c.toks)))
    print('methods called with ":" →', ' '.join(sorted(members)))
    print('problems:', bad)
    return bad


if __name__ == '__main__':
    sys.exit(1 if main(sys.argv[1:]) else 0)

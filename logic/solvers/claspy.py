import subprocess
from time import time, strftime
from functools import reduce

CLASP_COMMAND = 'clasp --sat-prepro --eq=1 --trans-ext=dynamic'
verbose = False
def set_verbose(b=True):
    """Set verbose to show rules as they are created."""
    global verbose
    verbose = b

last_update = time()
def need_update():
    """Returns True once every two seconds."""
    global last_update
    if time() - last_update > 2:
        last_update = time()
        return True
    return False

def hash_object(x):
    """Given a variable or object x, returns an object suitable for
    hashing.  Equivalent variables should return equivalent objects."""
    if hasattr(x, 'hash_object'):
        return x.hash_object()
    else:
        return x

memo_caches = []  
class memoized(object):
    def __init__(self, func):
        global memo_caches
        self.func = func
        self.cache = {}
        memo_caches.append(self.cache)
    def __call__(self, *args):
        try:
            key = tuple(map(hash_object, args))
            return self.cache[key]
        except KeyError:
            value = self.func(*args)
            self.cache[key] = value
            return value
        except TypeError:  # uncacheable
            return self.func(*args)
    def __repr__(self):
        """Return the function's docstring."""
        return self.func.__doc__
    def __get__(self, obj, objtype):
        """Support instance methods."""
        def result(*args):
            return self(obj, *args)
        return result

class memoized_symmetric(memoized):
    """Decorator that memoizes a function where the order of the
    arguments doesn't matter."""
    def __call__(self, *args):
        try:
            key = tuple(sorted(map(hash_object, args)))
            return self.cache[key]
        except KeyError:
            value = self.func(*args)
            self.cache[key] = value
            return value
        except TypeError:
            return self.func(*args)

TRUE_BOOL = None
FALSE_BOOL = None

def reset():
    """Reset the solver.  Any variables defined before a reset will
    have bogus values and should not be used."""
    global last_bool, TRUE_BOOL, FALSE_BOOL, solution
    global memo_caches, debug_constraints, clasp_rules
    global single_vars, NUM_BITS, BITS

    NUM_BITS = 16
    BITS = list(range(NUM_BITS))

    clasp_rules = []
    single_vars = set()
    last_bool = 1  # reserved in clasp

    TRUE_BOOL = BoolVar()
    require(TRUE_BOOL)
    FALSE_BOOL = ~TRUE_BOOL
    solution = set([TRUE_BOOL.index])

    for cache in memo_caches:
        cache.clear()
    debug_constraints = []

last_bool = None  # used to set the indexes of BoolVars
def new_literal():
    """Returns the number of a new literal."""
    global last_bool
    last_bool += 1
    return last_bool

def require(x, ignored=None):
    """Constrains the variable x to be true.  The second argument is
    ignored, for compatibility with required()."""
    x = BoolVar(x)
    add_basic_rule(1, [-x.index])  # basic rule with no head

debug_constraints = None
def required(x, debug_str):
    """A debugging tool.  The debug string is printed if x is False
    after solving.  You can find out which constraint is causing
    unsatisfiability by changing all require() statements to
    required(), and adding constraints for the expected solution."""
    global debug_constraints
    debug_constraints.append((x,debug_str))

clasp_rules = None
def add_rule(vals):
    """The rule is encoded as a series of integers, according to the
    SMODELS internal format.  See lparse.pdf pp.86 (pdf p.90)."""
    global clasp_rules
    clasp_rules.append(vals)
    if need_update():
        print((len(clasp_rules), 'rules'))  

def lit2str(literals):
    """For debugging, formats the given literals as a string matching
    smodels format, as would be input to gringo."""
    return ', '.join(['v' + str(x)
                         if x > 0 else 'not v' + str(-x) for x in literals])
def head2str(head):
    """Formats the head of a rule as a string."""
    # 1 is the _false atom (lparse.pdf p.87)
    return '' if head == 1 else 'v'+str(head)

def add_basic_rule(head, literals):
    # See rule types in lparse.pdf pp.88 (pdf p.92)
    if verbose:
        if len(literals) == 0: print(head2str(head) + '.')
        else: print(head2str(head), ':-', lit2str(literals) + '.')
    assert head > 0
    literals = optimize_basic_rule(head, literals)
    if literals is None:  # optimization says to skip this rule
        if verbose: print('#opt')
        return
    if verbose:
        if len(literals) == 0: print('#opt', head2str(head) + '.')
        else: print('#opt', head2str(head), ':-', lit2str(literals) + '.')
    # format: 1 head #literals #negative [negative] [positive]
    negative_literals = list(map(abs, [x for x in literals if x < 0]))
    positive_literals = [x for x in literals if x > 0]
    add_rule([1, head, len(literals), len(negative_literals)] +
             negative_literals + positive_literals)

def add_choice_rule(heads, literals):
    if verbose:
        if len(literals) == 0:
            print('{', lit2str(heads), '}.')
        else:
            print('{', lit2str(heads), '} :-', lit2str(literals))
    for i in heads:
        assert i > 0
    # format: 3 #heads [heads] #literals #negative [negative] [positive]
    negative_literals = list(map(abs, [x for x in literals if x < 0]))
    positive_literals = [x for x in literals if x > 0]
    add_rule([3, len(heads)] + heads +
             [len(literals), len(negative_literals)] +
             negative_literals + positive_literals)

def add_constraint_rule(head, bound, literals):
    # Note that constraint rules ignore repeated literals
    if verbose:
        print(head2str(head), ':-', bound, '{', lit2str(literals), '}.')
    assert head > 0
    # format: 2 head #literals #negative bound [negative] [positive]
    negative_literals = list(map(abs, [x for x in literals if x < 0]))
    positive_literals = [x for x in literals if x > 0]
    add_rule([2, head, len(literals), len(negative_literals), bound] +
             negative_literals + positive_literals)

def add_weight_rule(head, bound, literals):
    # Unlike constraint rules, weight rules count repeated literals
    if verbose:
        print(head2str(head), ':-', bound, '[', end=' ')
        print(', '.join([x + '=1' for x in lit2str(literals).split(', ')]), '].')
    assert head > 0
    # format: 5 head bound #literals #negative [negative] [positive] [weights]
    negative_literals = list(map(abs, [x for x in literals if x < 0]))
    positive_literals = [x for x in literals if x > 0]
    weights = [1 for i in range(len(literals))]
    add_rule([5, head, bound, len(literals), len(negative_literals)] +
             negative_literals + positive_literals + weights)

single_vars = None
def optimize_basic_rule(head, literals):
    """Optimizes a basic rule, returning a new set of literals, or
    None if the rule can be skipped."""
    if len(literals) == 0:  # the head must be true
        if head in single_vars: return None
        single_vars.add(head)
    elif head == 1 and len(literals) == 1:  # the literal must be false
        if -literals[0] in single_vars: return None
        single_vars.add(-literals[0])
    elif head == 1:  # we can optimize headless rules
        for x in literals:
            # if the literal is false, the clause is unnecessary
            if -x in single_vars:
                return None
            # if the literal is true, the literal is unnecessary
            if x in single_vars:
                new_literals = [y for y in literals if y != x]
                return optimize_basic_rule(head, new_literals)
    return literals

start_time = time()  # time when the library is loaded
solution = None  # set containing indices of true variables
def solve():
    """Solves for all defined variables.  If satisfiable, returns True
    and stores the solution so that variables can print out their
    values."""
    global last_bool, solution, debug_constraints, last_update

    print('Solving', last_bool, 'variables,', len(clasp_rules), 'rules')

    clasp_process = subprocess.Popen(CLASP_COMMAND.split(),
                                     stdin=subprocess.PIPE,
                                     stdout=subprocess.PIPE)
    try:
        for rule in clasp_rules:
            clasp_process.stdin.write(' '.join(map(str, rule)) + '\n')
    except IOError:
        # The stream may be closed early if there is obviously no
        # solution.
        print('Stream closed early!')
        return False

    print(0, file=clasp_process.stdin)  # end of rules
    # print the literal names
    for i in range(2, last_bool+1):
        print(i, 'v' + str(i), file=clasp_process.stdin)
    # print the compute statement
    clasp_process.stdin.write('0\nB+\n0\nB-\n1\n0\n1\n')
    if clasp_process.stdout is None:  # debug mode
        return
    clasp_process.stdin.close()
    found_solution = False
    clasp_output = []
    for line in clasp_process.stdout:
        if line.startswith('c Answer:'):
            solution = set()
        if line[0] == 'v':  # this is a solution line
            assert not found_solution
            solution = set([int(s[1:]) for s in line.rstrip().split(' ')])
            found_solution = True
            if verbose: print(line.rstrip())
        else:
            clasp_output.append(line.rstrip())
    if 'SATISFIABLE' in clasp_output: print('SATISFIABLE')
    elif 'UNSATISFIABLE' in clasp_output: print('UNSATISFIABLE')
    else: print('\n'.join(clasp_output))  # show info if there was an error
    print()
    print(('Total time: %.2fs' % (time() - start_time)))
    print()
    if solution and debug_constraints:
        for x, s in debug_constraints:
            if not x.value():
                print("Failed constraint:", s)
        print()
    last_update = time()  # reset for future searches
    return found_solution


################################################################################
##################################  Booleans  ##################################
################################################################################

# BoolVar is the root variable type, and represents a boolean that can
# take on either value.  Every boolean has an index, starting at 2,
# which is used when it's encoded to SMODELS internal representation.
# BoolVars can also have a negative index, indicating that its value
# is the inverse of the corresponding boolean.
class BoolVar(object):
    index = None  # integer <= -2 or >= 2.  Treat as immutable.
    def __init__(self, val=None):
        """BoolVar() : Creates a boolean variable.
        BoolVar(x) : Constraints to a particular value, or converts
        from another type."""
        if val is None:
            self.index = new_literal()
            add_choice_rule([self.index], [])  # define the var with a choice rule
        elif val is 'internal':  # don't create a choice rule. (for internal use)
            self.index = new_literal()
        elif val is 'noinit':  # don't allocate an index. (for internal use)
            return
        elif isinstance(val, BoolVar):
            self.index = val.index
        elif type(val) is bool or type(val) is int:
            self.index = TRUE_BOOL.index if val else FALSE_BOOL.index
        elif type(val) is IntVar:
            result = reduce(lambda a, b: a | b, val.bits)  # if any bits are non-zero
            self.index = result.index
        elif type(val) is MultiVar:
            # Use boolean_op to convert val to boolean because there's
            # no unary operator, and 'val != False' is inefficient.
            result = BoolVar(val.boolean_op(lambda a,b: a and b, True))
            self.index = result.index
        else:
            raise TypeError("Can't convert to BoolVar: " + str(val) + " " + str(type(val)))
    def hash_object(self):
        return ('BoolVar', self.index)
    def value(self):
        if self.index > 0:
            return self.index in solution
        else:
            return -self.index not in solution
    def __repr__(self):
        return str(int(self.value()))
    def info(self):
        return 'BoolVar[' + str(self.index) + ']=' + str(self)
    def __invert__(a):
        global last_bool
        # Invert the bool by creating one with a negative index.
        r = BoolVar('noinit')
        r.index = -a.index
        return r
    @memoized_symmetric
    def __eq__(a, b):
        b = BoolVar(b)
        if b.index == TRUE_BOOL.index: return a  # opt
        if b.index == FALSE_BOOL.index: return ~a  # opt
        r = BoolVar('internal')
        add_basic_rule(r.index, [a.index, b.index])
        add_basic_rule(r.index, [-a.index, -b.index])
        return r
    def __ne__(a, b): return ~(a == b)
    @memoized_symmetric
    def __and__(a, b):
        b = BoolVar(b)
        if b.index == TRUE_BOOL.index: return a  # opt
        if b.index == FALSE_BOOL.index: return FALSE_BOOL  # opt
        r = BoolVar('internal')
        add_basic_rule(r.index, [a.index, b.index])
        return r
    __rand__ = __and__
    @memoized_symmetric
    def __or__(a, b):
        b = BoolVar(b)
        if b.index == TRUE_BOOL.index: return TRUE_BOOL  # opt
        if b.index == FALSE_BOOL.index: return a  # opt
        r = BoolVar('internal')
        add_basic_rule(r.index, [a.index])
        add_basic_rule(r.index, [b.index])
        return r
    __ror__ = __or__
    @memoized_symmetric
    def __xor__(a, b):
        b = BoolVar(b)
        if b.index == TRUE_BOOL.index: return ~a  # opt
        if b.index == FALSE_BOOL.index: return a  # opt
        r = BoolVar('internal')
        add_basic_rule(r.index, [a.index, -b.index])
        add_basic_rule(r.index, [b.index, -a.index])
        return r
    __rxor__ = __xor__
    @memoized
    def __gt__(a, b):
        b = BoolVar(b)
        if b.index == TRUE_BOOL.index: return FALSE_BOOL  # opt
        if b.index == FALSE_BOOL.index: return a  # opt
        r = BoolVar('internal')
        add_basic_rule(r.index, [a.index, -b.index])
        return r
    def __lt__(a, b): return BoolVar(b) > a
    def __ge__(a, b): return ~(a < b)
    def __le__(a, b): return ~(a > b)
    @memoized_symmetric
    def __add__(self, other):
        return IntVar(self) + other
    def cond(cons, pred, alt):
        pred = BoolVar(pred)
        alt = BoolVar(alt)
        if cons.index == alt.index: return cons  # opt
        result = BoolVar('internal')
        add_basic_rule(result.index, [pred.index, cons.index])
        add_basic_rule(result.index, [-pred.index, alt.index])
        return result

def at_least(n, bools):
    """Returns a BoolVar indicating whether at least n of the given
    bools are True.  n must be an integer, not a variable."""
    assert type(n) is int
    bools = list(map(BoolVar, bools))
    result = BoolVar('internal')
    add_weight_rule(result.index, n, [x.index for x in bools])
    return result

def at_most(n, bools):
    """Returns a BoolVar indicating whether at most n of the given
    bools are True.  n must be an integer, not a variable."""
    return ~at_least(n + 1, bools)

def sum_bools(n, bools):
    """Returns a BoolVar indicating whether exactly n of the given
    bools are True.  n must be an integer, not a variable."""
    return at_least(n, bools) & at_most(n, bools)


################################################################################
####################################  Atoms  ###################################
################################################################################

# An atom is only true if it is proven.
class Atom(BoolVar):
    def __init__(self):
        BoolVar.__init__(self, 'internal')
    def prove_if(self, x):
        x = BoolVar(x)
        add_basic_rule(self.index, [x.index])


################################################################################
##################################  Integers  ##################################
################################################################################

NUM_BITS = None
BITS = None

def set_bits(n):
    """Sets the number of bits used for IntVars."""
    global NUM_BITS, BITS
    if last_bool > 2:  # true/false already defined
        raise RuntimeError("Can't change number of bits after defining variables")
    print('Setting integers to', n, 'bits')
    NUM_BITS = n
    BITS = list(range(NUM_BITS))

def set_max_val(n):
    """Sets the number of bits corresponding to maximum value n."""
    i = 0
    while n >> i != 0:
        i += 1
    set_bits(i)

def constrain_sum(a, b, result):
    """Constrain a + b == result.  Note that overflows are forbidden,
    even if the result is never used."""
    c = False 
    max_bit = max([i+1 for i in BITS if a.bits[i].index != FALSE_BOOL.index] +
                  [i+1 for i in BITS if b.bits[i].index != FALSE_BOOL.index] +
                  [i for i in BITS if result.bits[i].index != FALSE_BOOL.index])
    for i in BITS:
        d = (a.bits[i] ^ b.bits[i])
        require(result.bits[i] == (d ^ c))
        if i == max_bit:  # opt: we know the rest of the bits are false.
            return result
        c = (a.bits[i] & b.bits[i]) | (d & c)
    require(~c)  # forbid overflows
    return result

# IntVar is an integer variable, represented as a list of boolean variable bits.
class IntVar(object):
    bits = []  # An array of BoolVar bits, LSB first.  Treat as immutable.
    def __init__(self, val=None, max_val=None):
        """Creates an integer variable.
        IntVar() : Can be any integer in the range of the number of bits.
        IntVar(3) : A fixed integer.
        IntVar(1,9) : An integer in range 1 to 9, inclusive.
        IntVar(<IntVar>) : Copy another IntVar.
        IntVar(<BoolVar>) : Cast from BoolVar.
        IntVar([1,2,3]) : An integer resticted to one of these values."""
        if val is None:
            self.bits = [BoolVar() for i in BITS]
        elif max_val is not None:
            if type(val) is not int or type(max_val) is not int:
                raise RuntimeError('Expected two integers for IntVar() but got: ' +
                                   str(val) + ', ' + str(max_val))
            if max_val < val:
                raise RuntimeError('Invalid integer range: ' + str(val) + ', ' + str(max_val))
            if max_val >= (1 << NUM_BITS):
                raise RuntimeError('Not enough bits to represent max value: ' + str(max_val))
            self.bits = [(FALSE_BOOL if max_val >> i == 0 else BoolVar()) for i in BITS]
            if val > 0: require(self >= val)
            require(self <= max_val)
        elif type(val) is IntVar:
            self.bits = val.bits
        elif isinstance(val, BoolVar):
            self.bits = [val] + [FALSE_BOOL for i in BITS[1:]]
        elif type(val) is int and val >> NUM_BITS == 0:
            self.bits = [(TRUE_BOOL if ((val >> i) & 1) else FALSE_BOOL) for i in BITS]
        elif type(val) is bool:
            self.bits = [TRUE_BOOL if val else FALSE_BOOL] + [FALSE_BOOL for i in BITS[1:]]
        elif type(val) is list:
            self.bits = [BoolVar() for i in BITS]
            require(reduce(lambda a, b: a | b, [self == x for x in val]))
        else:
            raise TypeError("Can't convert to IntVar: " + str(val))
    def hash_object(self):
        return ('IntVar',) + tuple([b.index for b in self.bits])
    def value(self):
        return sum([(1 << i) for i in BITS if self.bits[i].value()])
    def __repr__(self):
        return str(self.value())
    def info(self):
        return ('IntVar[' + ','.join(reversed([str(b.index) for b in self.bits])) +
                ']=' + ''.join(reversed(list(map(str, self.bits)))) + '=' + str(self))
    @memoized_symmetric
    def __eq__(self, x):
        try: x = IntVar(x)
        except TypeError: return NotImplemented
        return reduce(lambda a, b: a & b,
                      [self.bits[i] == x.bits[i] for i in BITS])
    def __ne__(self, x): return ~(self == x)
    @memoized_symmetric
    def __add__(self, x):
        try: x = IntVar(x)
        except TypeError: return NotImplemented
       
        max_bit = max([i for i in BITS if self.bits[i].index != FALSE_BOOL.index] +
                      [i for i in BITS if x.bits[i].index != FALSE_BOOL.index] + [-1])
        result = IntVar(0)  
        result.bits = [(FALSE_BOOL if i > max_bit + 1 else BoolVar()) for i in BITS]
        constrain_sum(self, x, result)
        return result
    __radd__ = __add__
    @memoized
    def __sub__(self, x):
        try: x = IntVar(x)
        except TypeError: return NotImplemented
        result = IntVar()
        constrain_sum(result, x, self)
        return result
    __rsub__ = __sub__
    @memoized
    def __gt__(self, x):
        try: x = IntVar(x)
        except TypeError: return NotImplemented
        result = FALSE_BOOL
        for i in BITS:
            result = cond(self.bits[i] > x.bits[i], TRUE_BOOL,
                          cond(self.bits[i] < x.bits[i], FALSE_BOOL,
                               result))
        return result
    def __lt__(self, x): return IntVar(x) > self
    def __ge__(self, x): return ~(self < x)
    def __le__(self, x): return ~(self > x)
    def cond(cons, pred, alt):
        pred = BoolVar(pred)
        alt = IntVar(alt)
        result = IntVar(0)  
        result.bits = list(map(lambda c, a: c.cond(pred, a),
                          cons.bits, alt.bits))
        return result
    @memoized
    def __lshift__(self, i):
        assert type(i) is int
        if i == 0: return self
        if i >= NUM_BITS: return IntVar(0)
        result = IntVar(0)  
        result.bits = [FALSE_BOOL for x in range(i)] + self.bits[:-i]
        return result
    @memoized
    def __rshift__(self, i):
        assert type(i) is int
        result = IntVar(0)  
        result.bits = self.bits[i:] + [FALSE_BOOL for x in range(i)]
        return result
    @memoized_symmetric
    def __mul__(self, x):
        x = IntVar(x)
        result = IntVar(0)
        for i in BITS:
            result += cond(x.bits[i], self << i, 0)
        return result

@memoized
def cond(pred, cons, alt):
    """An IF statement."""
    if type(pred) is bool:
        return cons if pred else alt
    pred = BoolVar(pred)
    if pred.index == TRUE_BOOL.index: return cons  # opt
    if pred.index == FALSE_BOOL.index: return alt  # opt
    if ((isinstance(cons, BoolVar) or type(cons) is bool) and
        (isinstance(alt, BoolVar) or type(alt) is bool)):
        cons = BoolVar(cons)
        return cons.cond(pred, alt)
    if (type(cons) is IntVar or type(alt) is IntVar or
        (type(cons) is int and type(alt) is int)):
        cons = IntVar(cons)
        return cons.cond(pred, alt)
    # Convert everything else to MultiVars
    cons = MultiVar(cons)
    return cons.cond(pred, alt)

def require_all_diff(lst):
    """Constrain all variables in the list to be different.  Note that
    this creates O(N^2) rules."""
    def choose(items, num):
        """Returns an iterator over all choises of num elements from items."""
        if len(items) < num or num <= 0:
            yield items[:0]
            return
        if len(items) == num:
            yield items
            return
        for x in choose(items[1:], num - 1):
            yield items[:1] + x
        for x in choose(items[1:], num):
            yield x
    for a, b in choose(lst, 2):
        require(a != b)

def sum_vars(lst):
    """Sum a list of vars, using a tree.  This is often more efficient
    than adding in sequence, as bits can be saved."""
    if len(lst) < 2:
        return lst[0]
    middle = len(lst) // 2
    return sum_vars(lst[:middle]) + sum_vars(lst[middle:])

class MultiVar(object):
    vals = None  # Dictionary from value to boolean variable,
                 # representing that selection.  Treat as immutable.
    def __init__(self, *values):
        for v in values:
            hash(v)  # MultiVar elements must be hashable
        self.vals = {}
        if len(values) == 0:
            return  # uninitialized object: just for internal use
        if len(values) == 1:
            if type(values[0]) is MultiVar:
                self.vals = values[0].vals
            else:
                self.vals = {values[0]:TRUE_BOOL}
            return
        for v in values:
            if isinstance(v, BoolVar) or type(v) is IntVar or type(v) is MultiVar:
                raise RuntimeError("Can't convert other variables to MultiVar")
        # TODO: optimize two-value case to single boolean
        for v in set(values):
            self.vals[v] = BoolVar()
        # constrain exactly one value to be true
        require(sum_bools(1, list(self.vals.values())))
    def hash_object(self):
        return ('MultiVar',) + tuple([(x[0], x[1].index) for x in iter(self.vals.items())])
    def value(self):
        for v, b in list(self.vals.items()):
            if b.value():
                return v
        return '???'  # unknown
    def __repr__(self):
        return str(self.value())
    def info(self):
        return ('MultiVar[' + ','.join([str(v) + ':' + str(b.index)
                                        for v,b in self.vals.items()]) +
                ']=' + str(self))
    def boolean_op(a, op, b):
        """Computes binary op(a,b) where 'a' is a MultiVal.  Returns a BoolVar."""
        if type(b) is not MultiVar:
            b = MultiVar(b)
        true_count = 0
        false_count = 0
        for a_val, a_bool in a.vals.items():
            for b_val, b_bool in b.vals.items():
                if op(a_val, b_val):
                    true_count += 1
                else:
                    false_count += 1
        invert = false_count < true_count
        terms = []
        for a_val, a_bool in a.vals.items():
            for b_val, b_bool in b.vals.items():
                term = op(a_val, b_val) ^ invert
                terms.append(cond(term, a_bool & b_bool, False))
        if terms:
            result = reduce(lambda a, b: a | b, terms)
            return BoolVar(result) ^ invert
        else:
            return FALSE_BOOL ^ invert
    def generic_op(a, op, b):
        """计算op(a,b) 其中“a”是一个多变量 返回一个新的MultiVar"""
        if type(b) is not MultiVar:
            b = MultiVar(b)
        result = MultiVar()
        for a_val, a_bool in a.vals.items():
            for b_val, b_bool in b.vals.items():
                result_val = op(a_val, b_val)
                result_bool = a_bool & b_bool
                if result_val in result.vals:
                    result.vals[result_val] = result.vals[result_val] | result_bool
                else:
                    result.vals[result_val] = result_bool
        return result
    def __eq__(a, b): return a.boolean_op(lambda x, y: x == y, b)
    def __ne__(a, b): return ~(a == b)
    def __add__(a, b): return a.generic_op(lambda x, y: x + y, b)
    def __sub__(a, b): return a.generic_op(lambda x, y: x - y, b)
    def __mul__(a, b): return a.generic_op(lambda x, y: x * y, b)
    def __div__(a, b): return a.generic_op(lambda x, y: x / y, b)
    def __gt__(a, b): return a.boolean_op(lambda x, y: x > y, b)
    def __lt__(a, b): return MultiVar(b) > a
    def __ge__(a, b): return ~(a < b)
    def __le__(a, b): return ~(a > b)
    def __getitem__(a, b): return a.generic_op(lambda x, y: x[y], b)

    def cond(cons, pred, alt):
        pred = BoolVar(pred)
        alt = MultiVar(alt)
        result = MultiVar()
        for v, b in cons.vals.items():
            result.vals[v] = pred & b
        for v, b in alt.vals.items():
            if v in result.vals:
                result.vals[v] = result.vals[v] | (~pred & b)
            else:
                result.vals[v] = ~pred & b
        return result

def var_in(v, lst):
    return reduce(lambda a,b: a|b, [v == x for x in lst])
reset()

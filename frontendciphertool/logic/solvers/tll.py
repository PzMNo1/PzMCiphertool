from .claspy import *
from . import utils
from .utils.loops import *
from .utils.solutions import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda s: s)

# --- BEGIN ARMY OF HELPER FUNCTIONS ---

# -- Helper functions about generating possible loop patterns for clues --
def acc_patterns(acc, initial=''):
    '''
    Given a set `acc` to accumulate patterns into,
    and an initial condition `initial`,

    Calculate possible patterns around a Tapa Loop clue,
    starting from the NW corner, using the following notation:
        s: the start of a loop segment
        e: the end of a loop segment
        c: a corner (both start and end, in one cell)
        -: a continuation (neither a start nor an end)
        ' ': empty space
    '''
    if len(initial) == 0:
        for possible in 'cs-e ':
            acc_patterns(acc, possible)
    elif len(initial) == 7: # base case - need to complete loop
        if initial[0] in '-e': # if start of the loop needs a predecessor
            if initial[-1] in 's-': # if the previous cell needs a successor
                acc.add(initial + '-')
            else: # if previous cell has no successor
                acc.add(initial + 's')
        else: # start of loop has no successor
            if initial[-1] in 's-': # if the previous cell needs a successor
                acc.add(initial + 'e')
            else: # if previous cell has no successor
                acc.add(initial + ' ')
    else:
        if initial[-1] in 's-': # needs successor
            for possible in '-e':
                acc_patterns(acc, initial + possible)
        else: # cannot have successor
            for possible in 's ':
                acc_patterns(acc, initial + possible)
            if len(initial) in (2, 4, 6): # the current cell is a corner
                acc_patterns(acc, initial + 'c')

def calculate_lengths(pattern):
    '''
    Return a sorted tuple of (length, frequency) tuples for the lengths 
    of loop segments used by a pattern, in the output format used by `acc_patterns`.
    '''
    if pattern[0] in '-e':
        try:
            s_idx = pattern.index('s')
        except ValueError:
            # the loop is completely enclosed
            return ((8, 1),)
        return calculate_lengths_rotated(pattern[s_idx:] + pattern[:s_idx])
    return calculate_lengths_rotated(pattern)

def calculate_lengths_rotated(pattern):
    '''
    Return a sorted tuple of (length, frequency) tuples for the lengths 
    of loop segments used by a pattern, in the output format used by `acc_patterns`,

    WITH THE PRECONDITION THAT segment ends always follow segment starts
    in a naive left-to-right reading of the string.
    '''
    lengths = {}
    start_idx = None
    for i, c in enumerate(pattern):
        if c == 's':
            start_idx = i
        elif c == 'c':
            lengths[1] = lengths.get(1, 0) + 1
        elif c == 'e':
            lengths[i - start_idx + 1] = lengths.get(i - start_idx + 1, 0) + 1
            start_idx = None
    return tuple(sorted(lengths.items()))

def get_lookup():
    '''
    Get a 'lookup table' of sorted (length, frequency) pairs to sets of patterns.
    '''
    all_patterns = set()
    acc_patterns(all_patterns)

    lookup = {}
    for pattern in all_patterns:
        pattern_lengths = calculate_lengths(pattern)
        if pattern_lengths in lookup:
            lookup[pattern_lengths].add(pattern)
        else:
            lookup[pattern_lengths] = {pattern}
    
    return lookup

# Map of 'se- c' patterns to strings based on position (tuple's 0 index is NW corner)
POSITIONAL_SHAPES = (
    {'s': ('L', '-'), 'e': ('7', '1'), '-': ('r',), ' ': ('',), 'c': ('J',)},
    {'s': ('L',), 'e': ('J',), '-': ('-',), ' ': ('',)},
    {'s': ('r', '1'), 'e': ('J', '-'), '-': ('7',), ' ': ('',), 'c': ('L',)},
    {'s': ('r',), 'e': ('L',), '-': ('1',), ' ': ('',)},
    {'s': ('7', '-'), 'e': ('L', '1'), '-': ('J',), ' ': ('',), 'c': ('r',)},
    {'s': ('7',), 'e': ('r',), '-': ('-',), ' ': ('',)},
    {'s': ('J', '1'), 'e': ('r', '-'), '-': ('L',), ' ': ('',), 'c': ('7',)},
    {'s': ('J',), 'e': ('7',), '-': ('1',), ' ': ('',)},
)

# -- Helper functions for making the index that maps clues to patterns --
def expand_q(acc, counts):
    '''
    Expands a dictionary of the form {clue(string): count(int)}
    into all of its "possible" dictionaries (any ? clues become
    numbers).
    '''
    for i in range(1, 9):
        new_counts = counts.copy()
        if new_counts['?'] <= 1: # base case
            del new_counts['?']
            new_counts[i] = new_counts.get(i, 0) + 1
            acc.add(tuple(sorted(new_counts.items())))
        else:
            new_counts['?'] = new_counts['?'] - 1
            new_counts[i] = new_counts.get(i, 0) + 1
            expand_q(acc, new_counts)

def calculate_clue_counts(clue_list):
    '''
    Given a list of (string) clues, `clue_list`, calculates the
    frequencies of each one.
    '''
    counts = {}
    for clue in clue_list:
        counts[clue] = counts.get(clue, 0) + 1
    return counts

# --- end helper functions. ---

def solve(E):
    set_max_val(8)

    ls = utils.loops.RectangularGridLoopSolver(E.R, E.C)
    ls.loop(E.clues)

    lookup = get_lookup()

    def does_key_match_surroundings(key, adj_indices):
        '''
        Return BoolVar that tells us whether a key (a sorted tuple of (length, frequency) pairs)
        matches the surroundings.

        NOTE: REQUIRES that the pattern and `adj_indices` be generated in a clockwise order
        starting from NW corner.
        '''
        matches_at_least_one_pattern = False
        if key in lookup:
            for pattern in lookup[key]:
                this_pattern_matches_all = True
                for i, (y,x) in enumerate(adj_indices):
                    if is_valid_coord(E.R, E.C, y, x):
                        this_pattern_matches_all &= var_in(ls.grid[y][x], POSITIONAL_SHAPES[i][pattern[i]])
                    else: # trying to handle a cell off the edge
                        if pattern[i] != ' ': # impossible; give up
                            this_pattern_matches_all = False
                            break
                matches_at_least_one_pattern |= this_pattern_matches_all
        return matches_at_least_one_pattern

    # enforce Tapa clues
    for (r,c), clue in E.clues.items():
        adj_indices = [ (r+dr,c+dc) for (dr,dc) in
            ((-1,-1),(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1))
        ]
        condition = False # condition that this clue is fulfilled
        clue_counts = calculate_clue_counts(clue)
        if '?' in clue_counts:
            possible_counts = set()
            expand_q(possible_counts, clue_counts)
            for key in possible_counts:
                condition |= does_key_match_surroundings(key, adj_indices)
        else:
            key = tuple(sorted(clue_counts.items()))
            condition = does_key_match_surroundings(key, adj_indices)
        require(condition)
    return ls.solutions()

def decode(solutions):
    return utils.decode(solutions)

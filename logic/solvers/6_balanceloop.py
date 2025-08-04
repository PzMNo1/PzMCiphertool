from .claspy import *
from . import utils
from .utils.solutions import *
from .utils.loops import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s)

TURNING = ['J', '7', 'L', 'r']
STRAIGHT = ['-', '1']
def solve(E):
    max_clue_val = 0
    for (num, color) in E.clues.values():
        if num == '':
            max_clue_val = max(E.R, E.C)
        else:
            if color == '':
                raise ValueError('Every number must be in a circle.')
            max_clue_val = max(max_clue_val, int(num))
    set_max_val(max_clue_val)

    ls = RectangularGridLoopSolver(E.R, E.C)
    ls.loop({})

    for (r, c), (num, color) in E.clues.items():
        require(~var_in(ls.grid[r][c], ISOLATED))

        # Count the number of straight loop cells in each direction.
        count = {direction: IntVar(1) for direction in 'urdl'}
        has_found_bend = {direction: False for direction in 'urdl'}
        def count_cells(y, x, direction):
            '''
            Update 'count' and 'has_found_bend' variables depending
            on the cell at (y, x) and the direction.
            '''
            is_straight = var_in(ls.grid[y][x], STRAIGHT)
            is_bend = var_in(ls.grid[y][x], TURNING)
            count[direction] += cond(is_straight & ~has_found_bend[direction], 1, 0)
            has_found_bend[direction] |= is_bend

        for y in range(r-1, -1, -1):
            count_cells(y, c, 'u')
        for x in range(c+1, E.C):
            count_cells(r, x, 'r')
        for y in range(r+1, E.R):
            count_cells(y, c, 'd')
        for x in range(c-1, -1, -1):
            count_cells(r, x, 'l')

        def apply(fn):
            '''
            Apply a function that specifies a relationship between
            two count variables. (Use directions appropriate for the shape)
            '''
            shape_to_counts = {
                'L': (count['u'], count['r']),
                '1': (count['u'], count['d']),
                'J': (count['u'], count['l']),
                'r': (count['r'], count['d']),
                '-': (count['r'], count['l']),
                '7': (count['d'], count['l'])
            }
            for shape, counts in shape_to_counts.items():
                require(fn(*counts) | (ls.grid[r][c] != shape))

        # Apply constraints based on color (and #, if present).
        if color == 'w':
            apply(lambda x, y: x == y)
        else:
            apply(lambda x, y: x != y)
        if num != '':
            int_num = int(num)
            apply(lambda x, y: x + y == int_num)

    return ls.solutions()
   
def decode(solutions):
    return utils.decode(solutions)

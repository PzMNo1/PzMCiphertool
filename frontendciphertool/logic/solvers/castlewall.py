from .claspy import *
from . import utils
from .utils.loops import *

# DIRECTION_TO_OFFSET = {
#     'u': (-1, 0),
#     'r': (0, 1),
#     'd': (1, 0),
#     'l': (0, -1)
# }

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s)

def solve(E):
    # Validation.
    for clue in E.clues.values():
        if len(clue) != 3:
            raise ValueError('Improper clue formatting.')
        num, d, color = clue
        if (num == '') != (d == ''):
            # Number and direction must be specified together
            # (one alone is meaningless).
            raise ValueError('Number and direction must be specified together.')

    # Restrict the number of bits used for IntVar.
    # The highest number that we need is the highest clue number.
    set_max_val(max([int(clue[0] if clue[0].isnumeric() else 0) for clue in E.clues.values()], default=1))

    loop_solver = RectangularGridLoopSolver(E.R, E.C)
    loop_solver.loop(E.clues)

    white_clues, black_clues = set(), set()
    for ((r, c), (num, d, color)) in E.clues.items():
        # Numbers and directions.
        if num != '':
            if d == 'u':
                require(sum_bools(int(num), [var_in(loop_solver.grid[y][c], 
                    DOWN_CONNECTING) for y in range(r-1)]))
            elif d == 'r':
                require(sum_bools(int(num), [var_in(loop_solver.grid[r][x], 
                    RIGHT_CONNECTING) for x in range(c+1, E.C-1)]))
            elif d == 'd':
                require(sum_bools(int(num), [var_in(loop_solver.grid[y][c], 
                    DOWN_CONNECTING) for y in range(r+1, E.R-1)]))
            elif d == 'l':
                require(sum_bools(int(num), [var_in(loop_solver.grid[r][x], 
                    RIGHT_CONNECTING) for x in range(c-1)]))
        # Colors.
        if color == 'w':
            white_clues.add((r, c))
        elif color == 'b':
            black_clues.add((r, c))
    loop_solver.inside(white_clues)
    loop_solver.outside(black_clues)
    
    return loop_solver.solutions()
    
def decode(solutions):
    return utils.decode(solutions)

from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string)

def solve(E):
    if not(E.R % 2 == 0 and E.C % 2 == 0):
        raise ValueError('# rows and # columns must both be even!')

    set_max_val(max(E.R//2, E.C//2, 3))
    
    # Use True (black) to represent 1
    s = utils.RectangularGridShadingSolver(E.R, E.C)
    black_row_counts = [[IntVar(0, 3) for c in range(E.C)] for r in range(E.R)]
    black_col_counts = [[IntVar(0, 3) for c in range(E.C)] for r in range(E.R)]
    white_row_counts = [[IntVar(0, 3) for c in range(E.C)] for r in range(E.R)]
    white_col_counts = [[IntVar(0, 3) for c in range(E.C)] for r in range(E.R)]
    
    for r in range(E.R):
        # Half of the items in a row must be 1s; the other half must be 0s
        require(sum_bools(E.C//2, [s.grid[r][c] for c in range(E.C)]))
        require(black_row_counts[r][0] == cond(s.grid[r][0], 1, 0))
        require(white_row_counts[r][0] == cond(s.grid[r][0], 0, 1))
        for c in range(1, E.C):
            require(black_row_counts[r][c] == cond(s.grid[r][c], black_row_counts[r][c-1] + 1, 0))
            require(white_row_counts[r][c] == cond(s.grid[r][c], 0, white_row_counts[r][c-1] + 1))
            require(black_row_counts[r][c] < 3)
            require(white_row_counts[r][c] < 3)

    for c in range(E.C):
        require(sum_bools(E.R//2, [s.grid[r][c] for r in range(E.R)]))
        require(black_col_counts[0][c] == cond(s.grid[0][c], 1, 0))
        require(white_col_counts[0][c] == cond(s.grid[0][c], 0, 1))
        for r in range(1, E.R):
            require(black_col_counts[r][c] == cond(s.grid[r][c], black_col_counts[r-1][c] + 1, 0))
            require(white_col_counts[r][c] == cond(s.grid[r][c], 0, white_col_counts[r-1][c] + 1))
            require(black_col_counts[r][c] < 3)
            require(white_col_counts[r][c] < 3)

    # Require that no two rows are the same.
    for r1 in range(E.R):
        for r2 in range(r1+1, E.R):
            require(~sum_bools(E.C, [s.grid[r1][c] == s.grid[r2][c] for c in range(E.C)]))

    # Require that no two columns are the same.
    for c1 in range(E.C):
        for c2 in range(c1+1, E.C):
            require(~sum_bools(E.R, [s.grid[r][c1] == s.grid[r][c2] for r in range(E.R)]))
            
    # Populate given clues.
    for (r, c) in E.clues:
        if E.clues[(r, c)] == 1:
            require(s.grid[r][c])
        elif E.clues[(r, c)] == 0:
            require(~s.grid[r][c])
        else:
            raise ValueError('Please only enter 0s or 1s')

    return s.solutions()
    
def decode(solutions):
    return utils.decode(solutions)

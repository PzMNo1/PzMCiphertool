from .claspy import *
from . import utils
from .utils import borders
from .utils.borders import Direction

def encode(string):
    return utils.encode(string, has_borders = True, outside_clues = '1001')

def solve(E):
    max_left_clue = max(E.left.values(), default=0)
    max_top_clue = max(E.top.values(), default=0)
    set_max_val(max(max_left_clue, max_top_clue, 1))

    s = utils.RectangularGridShadingSolver(E.R, E.C)
    
    # Ensure that counts of shaded cells in columns and rows are satisfied.
    for c in E.top:
        require(sum_bools(E.top[c], [s.grid[r][c] for r in range(E.R)]))
    for r in E.left:
        require(sum_bools(E.left[r], [s.grid[r][c] for c in range(E.C)]))
    
    # Water-falling constraints.
    for r in range(1, E.R):
        for c in range(E.C):
            # If there is no top border on a cell,
            if (r, c, Direction.TOP) not in E.edges:
                # When the cell above it is shaded, the cell itself is also shaded.
                require(s.grid[r][c] | ~s.grid[r-1][c])
    for c in range(1, E.C):
        for r in range(E.R):
            # If there is no vertical border between cells,
            if (r, c, Direction.LEFT) not in E.edges:
                # The two cells' shadedness must match.
                require(s.grid[r][c] == s.grid[r][c-1])

    return s.solutions(shaded_color = 'lightblue')


def decode(solutions):
    return utils.decode(solutions)
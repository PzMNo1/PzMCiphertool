from .claspy import *
from . import utils
from .utils.solutions import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s)
    
class Box(object):
    '''
    A box whose borders (inclusive) are given by top, bottom, left, & right.
    e.g. Box(0, 2, 1, 3) would make a 3x3 box with upper left is at (0, 1) & lower right at (2, 3)
    '''
    def __init__(self, top, bottom, left, right):
        self.top = top
        self.bottom = bottom
        self.left = left
        self.right = right

def solve(E):
    # Pre-processing. Necessary to filter out invalid clues.
    # Assign each clue to an ID (bijection, by puzzle rules)
    clue_to_id = {}
    for (r, c), value in E.clues.items():
        if value in '+|-':
            clue_to_id[(r, c)] = len(clue_to_id)
        else:
            raise ValueError('Clues must be +, |, or -.')

    if len(clue_to_id) == 0:
        raise ValueError('Please provide at least one clue.')

    rs = utils.RectangularGridRegionSolver(E.R, E.C, max_num_regions = len(clue_to_id))

    # Assign each clue to a Box
    clue_to_box = {}
    for (r, c) in clue_to_id:
        value = E.clues[(r, c)]
        box = Box(IntVar(0, E.R-1), IntVar(0, E.R-1), IntVar(0, E.C-1), IntVar(0, E.C-1))
        clue_to_box[(r, c)] = box
        # Box preconditions.
        require(box.top <= box.bottom)
        require(box.left <= box.right)
        # Shape constraints.
        height = box.bottom - box.top
        width =  box.right - box.left
        if value == '+':
            require(height == width)
        elif value == '|':
            require(width < height)
        elif value == '-':
            require(height < width)

    # Assign region IDs based on clue locations and Box corners
    for r in range(E.R):
        for c in range(E.C):
            for (y, x) in clue_to_id:
                box = clue_to_box[(y, x)]
                require(rs.region_id[y][x] == clue_to_id[(y, x)])
                require(((box.top <= r) & (r <= box.bottom) & (box.left <= c) & (c <= box.right)) == \
                    (rs.region_id[r][c] == clue_to_id[(y, x)]))

    # No 4 boxes at same corner.
    for r in range(E.R-1):
        for c in range(E.C-1):
            four_cells = [rs.grid[y][x] \
                for (y,x) in ((r,c), (r,c+1), (r+1,c), (r+1,c+1))]
            all_diff = BoolVar(True)
            for i in range(4):
                for j in range(i):
                    all_diff &= four_cells[i] != four_cells[j]
            require(~all_diff)

    return rs.solutions()


def decode(solutions):
    return utils.decode(solutions)

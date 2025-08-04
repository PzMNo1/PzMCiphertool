from .claspy import *
from . import utils
from .utils.solutions import *

def encode(string):
    return utils.encode(string)
    
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
    if len(E.clues) == 0:
        raise ValueError('Please provide at least one clue.')

    rs = utils.RectangularGridRegionSolver(E.R, E.C, max_num_regions = len(E.clues))

    # Assign each clue to an ID (bijection, by puzzle rules)
    clue_to_id = {}
    for (r, c) in E.clues:
        require(rs.region_id[r][c] == len(clue_to_id))
        clue_to_id[(r, c)] = len(clue_to_id)

    # Assign each clue to a Box
    clue_to_box = {}
    for (r, c) in E.clues:
        box = Box(IntVar(0, E.R-1), IntVar(0, E.R-1), IntVar(0, E.C-1), IntVar(0, E.C-1))
        clue_to_box[(r, c)] = box
        # Rectangle size constraints from clues
        # Factor pairs are "ordered" (i.e. (a, b) and (b, a) will both be present if a != b)
        if E.clues[(r,c)] != '?':
            possible_dims = utils.numbers.factor_pairs(E.clues[(r, c)])
            dim_constraint = BoolVar(False)
            for (a, b) in possible_dims:
                # Add, don't subtract, just to be safe
                # Eqivalent to box.bottom - box.top + 1 == a, & similar for L/R
                dim_constraint |= ((box.top + a == box.bottom + 1) & (box.left + b == box.right + 1))
            require(dim_constraint)

    # Assign region IDs based on Box corners
    for r in range(E.R):
        for c in range(E.C):
            for (x, y) in E.clues:
                box = clue_to_box[(x, y)]
                require(((box.top <= r) & (r <= box.bottom) & (box.left <= c) & (c <= box.right)) == \
                    (rs.region_id[r][c] == clue_to_id[(x, y)]))

    return rs.solutions()


def decode(solutions):
    return utils.decode(solutions)

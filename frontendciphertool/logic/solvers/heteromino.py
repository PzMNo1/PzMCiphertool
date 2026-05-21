from .claspy import *
from . import utils
from .utils.borders import *
from .utils.grids import *
from .utils.solutions import *

# --- Shape definitions ---
shapeI = 'I' # Vertical segment, size 3
shape_ = '-' # Horizontal segment, size 3
shape7 = '7' # 7-shaped segment, size 3
shapeJ = 'J' # J-shaped segment, size 3
shapeL = 'L' # L-shaped segment, size 3
shaper = 'r' # r-shaped segment, size 3

SHAPES = (shapeI, shape_, shape7, shapeJ, shapeL, shaper)

# --- Maps the offset from x to y to the direction from y to x ---
OFFSET_PARENT_PAIRS = {
    (-1, 0): 'v',
    (0, 1): '<',
    (1, 0): '^',
    (0, -1): '>'
}

NEIGHBORS = {
    shapeI: ((-1, 0), (1, 0)),
    shape_: ((0, -1), (0, 1)),
    shape7: ((0, -1), (1, 0)),
    shapeJ: ((-1, 0), (0, -1)),
    shapeL: ((-1, 0), (0, 1)),
    shaper: ((0, 1), (1, 0))
}

def inverse(t):
    return tuple(-1*t[x] for x in range(len(t)))

# For ths sake of this solver, the middle cell in a region must always be root.

def encode(string):
    return utils.encode(string)

def solve(E):
    shape = [[MultiVar(*SHAPES+('x',)) for c in range(E.C)] for r in range(E.R)]
    parent = [[MultiVar('^','v','>','<','.','x') for c in range(E.C)] for r in range(E.R)]

    for r in range(E.R):
        for c in range(E.C):
            # parent and shape == 'x' iff shaded
            if (r, c) in E.clues:
                require(shape[r][c] == 'x')
                require(parent[r][c] == 'x')
            else:
                require(shape[r][c] != 'x')
                require(parent[r][c] != 'x')
                # Ensure that every root's neighbors have appropriate shapes + parents.
                for possible_shape in SHAPES:
                    neighbor_conds = True
                    for (dy, dx) in OFFSET_PARENT_PAIRS:
                        y, x = r+dy, c+dx
                        if is_valid_coord(E.R, E.C, y, x):
                            # If (y, x) is one of the required neighbors for this shape,
                            # assign its shape and parent values.
                            if (dy, dx) in NEIGHBORS[possible_shape]:
                                neighbor_conds &= ((shape[y][x] == possible_shape) & 
                                    (parent[y][x] == OFFSET_PARENT_PAIRS[(dy,dx)]))
                            # Otherwise, insist that (y, x) has some other parent (not (r, c)).
                            else:
                                neighbor_conds &= (parent[y][x] != OFFSET_PARENT_PAIRS[(dy,dx)])
                        else:
                            # Cell doesn't exist so it can't have the right parent.
                            # It can't have the wrong parent either, though, so no condition needed there.
                            if (dy, dx) in NEIGHBORS[possible_shape]:
                                # Trying to use a cell that's off the grid.
                                neighbor_conds = False
                                break
                    require(neighbor_conds | ~((shape[r][c] == possible_shape) & (parent[r][c] == '.')))

                for (dy, dx), possible_parent in OFFSET_PARENT_PAIRS.items():
                    parent_dy, parent_dx = inverse((dy, dx))
                    y, x = r+parent_dy, c+parent_dx # Coordinate of the supposed parent of (r,c)

                    if is_valid_coord(E.R, E.C, y, x):
                        # Ensure that every arrow points directly at a root of the same shape type.
                        require(((parent[y][x] == '.') & (shape[y][x] == shape[r][c]))
                             | (parent[r][c] != possible_parent))
                    else:
                        # Trying to use a cell that's off the grid.
                        require(parent[r][c] != possible_parent)
                
                    # Ensure that identical shapes are not adjacent
                    # (the only cell adjacent to (r, c) with the same shape pattern is its parent)
                    for (cell_r, cell_c) in get_neighbors(E.R, E.C, r, c):
                        if (cell_r, cell_c) != (y, x):
                            require((shape[cell_r][cell_c] != shape[r][c]) | (parent[r][c] != possible_parent))

    # --- Compile the solution ---
    def generate_solution():
        solution = {}
        for r in range(E.R):
            for c in range(E.C):
                # Top
                edge = (r, c, Direction.TOP)
                if is_valid_coord(E.R, E.C, r-1, c):
                    if shape[r-1][c].value() != shape[r][c].value():
                        solution[get_border_coord_from_edge_id(*edge)] = 'black'
                else:
                    solution[get_border_coord_from_edge_id(*edge)] = 'black'
                # Left
                edge = (r, c, Direction.LEFT)
                if is_valid_coord(E.R, E.C, r, c-1):
                    if shape[r][c-1].value() != shape[r][c].value():
                        solution[get_border_coord_from_edge_id(*edge)] = 'black'
                else:
                    solution[get_border_coord_from_edge_id(*edge)] = 'black'
                # Bottom
                if r == E.R-1:
                    solution[get_border_coord_from_edge_id(r, c, Direction.BOTTOM)] = 'black'
                # Right
                if c == E.C-1:
                    solution[get_border_coord_from_edge_id(r, c, Direction.RIGHT)] = 'black'
        return solution

    def avoid_duplicate_solution():
        x = BoolVar(True)
        for r in range(E.R):
            for c in range(E.C):
                x = x & (shape[r][c] == shape[r][c].value())
        require(~x)

    return get_all_solutions(generate_solution, avoid_duplicate_solution)

def decode(solutions):
    return utils.decode(solutions)

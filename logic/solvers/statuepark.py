from .claspy import *
from . import utils
from .utils.shapes import *
from .utils.encoding import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda s: s)

def solve(E):
    shapeset = E.params['shapeset']

    shape_id_to_variants = {}
    if shapeset == 'Tetrominoes':
        for tetromino in OMINOES[4].values():
            shape_id_to_variants[len(shape_id_to_variants)] = get_variants(tetromino, True, True)
    elif shapeset == 'Pentominoes':
        for pentomino in OMINOES[5].values():
            shape_id_to_variants[len(shape_id_to_variants)] = get_variants(pentomino, True, True)
    elif shapeset == 'Double Tetrominoes':
        for tetromino in OMINOES[4].values():
            variants = get_variants(tetromino, True, True)
            shape_id_to_variants[len(shape_id_to_variants)] = variants
            # this is useful because the second time, we assign the next higher id
            shape_id_to_variants[len(shape_id_to_variants)] = variants
    else:
        raise ValueError('Shape set not supported.')

    shape_id_bound = len(shape_id_to_variants)
    grid = [[IntVar(0, shape_id_bound) for c in range(E.C)] for r in range(E.R)]
    s = utils.RectangularGridShadingSolver(E.R, E.C, grid, 
        shading_symbols = [shape_id for shape_id in range(shape_id_bound)])
    
    # keep track of a list of "shape conditions", where each "shape condition" requires
    # that all cells involved in the shape have the correct shape ID
    # and that no other cell anywhere else does
    for shape_id, variants in shape_id_to_variants.items():
        possible_shape_conditions = []
        for r in range(E.R):
            for c in range(E.C):
                for variant in variants:
                    occupied_cells = place_shape_in_grid(E.R, E.C, variant, r, c)
                    if occupied_cells != None:
                        possible_shape_conditions.append(
                            sum_bools(E.R*E.C, 
                                [(grid[y][x] == shape_id) == ((y,x) in occupied_cells) \
                                    for y in range(E.R) for x in range(E.C)])
                        )
        # exactly 1 of the possible placements is actually correct
        require(sum_bools(1, possible_shape_conditions))
        
    # no touchy rule
    for r in range(E.R):
        for c in range(E.C):
            # for each pair of neighbors, they are either part of the same shape
            # or at least one is not part of any shape
            for (y, x) in utils.grids.get_neighbors(E.R, E.C, r, c):
                require(
                    (grid[r][c] == grid[y][x]) | 
                    (grid[r][c] == shape_id_bound) |
                    (grid[y][x] == shape_id_bound)
                )

    # unshaded connectivity
    s.white_connectivity()
    
    # require clue correctness
    for (r, c) in E.clues:
        require((E.clues[(r,c)] == 'w') == (grid[r][c] == shape_id_bound))
            
    return s.solutions()

def decode(solutions):
    return utils.decode(solutions)

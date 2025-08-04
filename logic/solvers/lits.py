from .claspy import *
from . import utils
from .utils.shapes import *
from .utils.encoding import *

L = OMINOES[4]['L']
I = OMINOES[4]['I']
T = OMINOES[4]['T']
S = OMINOES[4]['S']

def encode(string):
    return utils.encode(string, has_borders = True)

def solve(E):
    regions = utils.full_bfs(E.R, E.C, E.edges)

    if len(regions) == 1:
        raise ValueError('Are you sure you drew all of the borders?')
    
    # make a list of lists, where each internal list represents a row of the puzzle.
    # each cell has value:
    # - 'L': if the cell is part of an L shape
    # - 'I': if the cell is part of an I shape
    # - 'T': if the cell is part of an T shape
    # - 'S': if the cell is part of an S shape
    # - ' ': if the cell is empty
    grid = [[MultiVar('L', 'I', 'T', 'S', ' ') for c in range(E.C)] for r in range(E.R)]
    
    # make a dictionary which maps each character in 'LITS' to a tuple of tuples,
    # where each internal tuple is a canonical representation of a shape variant
    variants = {}
    for name, shape in (('L', L), ('I', I), ('T', T), ('S', S)):
        variants[name] = get_variants(shape, True, True)
        
    for region in regions:
        # keep track of a list of "shape conditions", where each "shape condition" requires:
        #  - that a shape is at located at a particular coordinate
        #  (all cells involved in the shape have the correct grid values)
        #  - that there are no other shaded cells in that region
        possible_shape_conditions = []
        for (r, c) in region:
            # for each "type" (LITS)
            for lits_type in variants:
                # for each variant (a canonical shape representation of one of the type's variants)
                for variant in variants[lits_type]:
                    # get a list of cells that this variant occupies when its anchor point is (r, c)
                    occupied_cells = place_shape_in_region(region, variant, r, c)
                    # if the shape actually fits in the region
                    if occupied_cells != None:
                        # set all of the occupied cells' LITS values
                        shape_cells = sum_bools(4, [grid[y][x] == lits_type for (y, x) in occupied_cells])
                        # all other cells must be empty
                        non_shape_cells = []
                        for (y, x) in region:
                            if (y, x) not in occupied_cells:
                                non_shape_cells.append(grid[y][x] == ' ')
                        non_shape_cells = sum_bools(len(region)-4, non_shape_cells)
                        # the "shape condition" requires that we have a exactly one shape in the region
                        shape_cond = shape_cells & non_shape_cells
                        # keep track of this particular shape condition
                        possible_shape_conditions.append(shape_cond)
                        # all of the shapes (if any) that are adjacent to this one cannot be of the same type
                        neighboring_cells = get_adjacent(E.R, E.C, variant, r, c)
                        require(sum_bools(len(neighboring_cells),
                                    [grid[y][x] != lits_type for (y, x) in neighboring_cells]) |
                                        ~shape_cond)
        # of the possible shapes, exactly 1 of them is actually correct
        require(sum_bools(1, possible_shape_conditions))
    
    # add black-connectivity and no-2x2 rules
    shading_solver = utils.RectangularGridShadingSolver(E.R, E.C, grid, ['L', 'I', 'T', 'S'])
    shading_solver.black_connectivity()
    shading_solver.no_black_2x2()
    
    return shading_solver.solutions(shaded_color = 'darkgray')

def decode(solutions):
    return utils.decode(solutions)

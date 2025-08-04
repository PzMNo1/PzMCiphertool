from .claspy import *
from . import utils

def encode(string):
    def clue_encoder(s):
        try:
            return utils.default_clue_encoder(s)
        except RuntimeError:
            if s[0] == 's' and s[1:].isnumeric(): # signpost clue
                return s
            else:
                raise RuntimeError('Invalid input, still')
                
    E = utils.encode(string, clue_encoder = clue_encoder, has_borders = True)

    # separate signpost clues from regular clues
    new_clues = {}
    E.signpost_clues = {}
    for key in E.clues:
        s = E.clues[key]
        if type(s) == str and s[0] == 's' and s[1:].isnumeric(): # signpost clue
            E.signpost_clues[key] = int(s[1:])
        else:
            new_clues[key] = s
    E.clues = new_clues
    return E

def solve(E):
    rooms = utils.regions.full_bfs(E.R, E.C, E.edges)

    # note:  not the largest clue value! not every region has a clue in it,
    # so a big region could require more unshaded cells than the largest clue.
    set_max_val(max(len(room) for room in rooms))
    
    shading_solver = utils.RectangularGridShadingSolver(E.R, E.C)
    region_solver = utils.RectangularGridRegionSolver(E.R, E.C, shading_solver.grid, rooms)
    
    shading_solver.white_clues(E.clues)
    shading_solver.white_connectivity()
    shading_solver.no_white_2x2()
    
    region_solver.set_unshaded_cells_in_region(E.clues, [True])
    
    # require each region to have at least one numbered cell
    for region in rooms:
        require(at_least(1, [~shading_solver.grid[r][c] for (r, c) in region]))

    # require signpost clues to be true
    for region in rooms:
        for cell in region:
            if cell in E.signpost_clues:
                require(sum_bools(E.signpost_clues[cell], [~shading_solver.grid[p] for p in region]))
    
    for r in range(E.R):
        for c in range(E.C):
            unshaded_count = region_solver.get_unshaded_cells_in_region(r, c, [True])
            neighbors = region_solver.get_neighbors_in_other_regions(r, c)
            # white cells that are next to each other and in different regions
            # cannot have the same number in them
            require(sum_bools(0, [
                (~shading_solver.grid[r][c] &
                ~shading_solver.grid[y][x] &
                (unshaded_count == region_solver.get_unshaded_cells_in_region(y, x, [True]))
                ) for (y, x) in neighbors
            ]))
            
    def format_function(r, c):
        unshaded_count = region_solver.get_unshaded_cells_in_region(r, c, [True])
        return 'darkgray' if shading_solver.grid[r][c].value() else unshaded_count.value()
    
    return utils.get_all_grid_solutions(shading_solver.grid, format_function = format_function)

def decode(solutions):
    return utils.decode(solutions)

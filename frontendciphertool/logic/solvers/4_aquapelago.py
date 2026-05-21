from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s)

def solve(E):
    unclued_shaded_region_id = len(E.clues)
    unshaded_region_id = len(E.clues) + 1
    num_real_region_ids = len(E.clues)
    num_region_ids = len(E.clues) + 2 # Reserve 2 fake region IDs; one for unshaded tiles and the other for non-clued shaded tiles
    max_val = max(num_region_ids, max([int(value) if value.isnumeric() else max(E.R, E.C) for value in E.clues.values()])) if E.clues else max(E.R, E.C)
    set_max_val(max_val)

    known_unshaded_cell = None
    for (r, c) in E.clues:
        neighbors = utils.grids.get_neighbors(E.R, E.C, r, c)
        if neighbors:
            known_unshaded_cell = neighbors[0]
            break

    grid = [[MultiVar(*'r7LJ.x') for c in range(E.C)] for r in range(E.R)]

    s = utils.shading.RectangularGridShadingSolver(E.R, E.C, grid, list('r7LJ.'))
    s.no_adjacent()
    s.no_white_2x2()
    s.white_connectivity(known_unshaded_cell)

    # see utils.regions.make_regions

    # this is needed so every group of clued cells has a root

    # flow_c is a grid of Atoms used to ensure that all cells are
    # connected along the parent pointer field to a root cell.
    flow_c = [[Atom() for c in range(E.C)] for r in range(E.R)]

    region_id = [[IntVar(0, num_region_ids-1) for c in range(E.C)] for r in range(E.R)]

    for r in range(E.R):
        for c in range(E.C):
            # The root cell is proven.
            flow_c[r][c].prove_if(grid[r][c] == '.')
            # All unshaded cells must be proven by following the flow
            # backwards from the root.

            if r > 0 and c > 0:
                flow_c[r][c].prove_if((grid[r][c] == 'r') & flow_c[r-1][c-1] &
                                    (region_id[r][c] == region_id[r-1][c-1]))
            if r < E.R-1 and c > 0:
                flow_c[r][c].prove_if((grid[r][c] == 'L') & flow_c[r+1][c-1] &
                                    (region_id[r][c] == region_id[r+1][c-1]))
            if r > 0 and c < E.C-1:
                flow_c[r][c].prove_if((grid[r][c] == '7') & flow_c[r-1][c+1] &
                                    (region_id[r][c] == region_id[r-1][c+1]))
            if r < E.R-1 and c < E.C-1:
                flow_c[r][c].prove_if((grid[r][c] == 'J') & flow_c[r+1][c+1] &
                                    (region_id[r][c] == region_id[r+1][c+1]))

            # all shaded cells must have flow
            require(flow_c[r][c] | (grid[r][c] == 'x'))

    # \-adjacent cells have the same region value iff their shadings are equal.
    for r in range(E.R-1):
        for c in range(E.C-1):
            require(
                ((grid[r][c] != 'x') == (grid[r+1][c+1] != 'x')) == (region_id[r][c] == region_id[r+1][c+1])
            )

    # /-adjacent cells have the same region value iff their shadings are equal.
    for r in range(E.R-1):
        for c in range(1, E.C):
            require(
                ((grid[r][c] != 'x') == (grid[r+1][c-1] != 'x')) == (region_id[r][c] == region_id[r+1][c-1])
            )

    # Require that each region has at most 1 root, except for fake regions
    for i in range(num_real_region_ids):
        require(at_most(1, [(region_id[r][c] == i) & (grid[r][c] == '.') for r in range(E.R) for c in range(E.C)]))

    # Some additional things required to make this work
    for (r, c) in E.clues:
        require(grid[r][c] != 'x')
        require(region_id[r][c] != unclued_shaded_region_id)

    for r in range(E.R):
        for c in range(E.C):
            require((grid[r][c] == 'x') == (region_id[r][c] == unshaded_region_id))

    # see utils.regions.set_region_size

    # Note: region size counting in aquapelago is "fillomino-like" (same-numbered clues can be combined)

    # To count cells in a group, create a grid of IntVars, where each value
    # is the sum of the values that flow towards it, plus one.
    upstream = [[IntVar(0, max_val) for c in range(E.C)] for r in range(E.R)]
    region_size = [[IntVar(0, max_val) for c in range(E.C)] for r in range(E.R)]
    for r in range(E.R):
        for c in range(E.C):
            upstream_count = IntVar(0)

            if r > 0 and c > 0:
                upstream_count += cond(grid[r-1][c-1] == 'J', upstream[r-1][c-1], 0)
                require((region_size[r][c] == region_size[r-1][c-1]) | (grid[r-1][c-1] != 'J'))

            if r < E.R-1 and c > 0:
                upstream_count += cond(grid[r+1][c-1] == '7', upstream[r+1][c-1], 0)
                require((region_size[r][c] == region_size[r+1][c-1]) | (grid[r+1][c-1] != '7'))

            if r > 0 and c < E.C-1:
                upstream_count += cond(grid[r-1][c+1] == 'L', upstream[r-1][c+1], 0)
                require((region_size[r][c] == region_size[r-1][c+1]) | (grid[r-1][c+1] != 'L'))

            if r < E.R-1 and c < E.C-1:
                upstream_count += cond(grid[r+1][c+1] == 'r', upstream[r+1][c+1], 0)
                require((region_size[r][c] == region_size[r+1][c+1]) | (grid[r+1][c+1] != 'r'))

            # if cell is part of some region, it must obey the upstream counting rule;
            # otherwise, its count is 0.
            require(cond(grid[r][c] == 'x', upstream[r][c] == 0, upstream[r][c] == (upstream_count + 1)))

            # associate upstream grid with region_size grid at the roots.
            require((grid[r][c] != '.') | (upstream[r][c] == region_size[r][c]))

            # If this is a root cell, then the count must match the cell's value.
            if (r, c) in E.clues:
                value = E.clues[(r, c)]
                if value.isnumeric():
                    number_value = int(value)
                    require(region_size[r][c] == number_value)
            # this isn't a root cell, unless it's in an unclued shaded region
            else:
                require((grid[r][c] != '.') | (region_id[r][c] == unclued_shaded_region_id))

    return s.solutions()

def decode(solutions):
    return utils.decode(solutions)

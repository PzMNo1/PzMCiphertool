from .claspy import *
from . import utils
from .utils.borders import Direction

def encode(string):
    return utils.encode(string)

def solve(E):
    unclued_shaded_region_id = len(E.clues)
    unclued_unshaded_region_id = len(E.clues) + 1
    fake_region_ids = (unclued_shaded_region_id, unclued_unshaded_region_id)
    max_num_regions = unclued_unshaded_region_id + 1

    max_region_size = max({1}.union(E.clues.values()))

    # max val = max region ID or max clue
    set_max_val(max(max_num_regions-1, max_region_size))

    # For each (r, c) clue, figure out the set of other clue coordinates which could possibly be in the same region.
    coordinates_possibly_in_same_region = {}
    for ((r, c), v) in E.clues.items():
        coords_for_r_c = set()
        for ((y, x), v2) in E.clues.items():
            if (y, x) == (r, c):
                continue
            if v != v2:
                continue
            if utils.grids.manhattan_distance((r, c), (y, x)) >= v:
                continue
            coords_for_r_c.add((y, x))
        coordinates_possibly_in_same_region[(r, c)] = coords_for_r_c

    # Map each clue cell to its clue number
    # (starts at 0, increases left-to-right, top-to-bottom)
    clue_cell_id = {}
    for (r, c) in E.clues:
        clue_cell_id[(r, c)] = len(clue_cell_id)

    region_symbol_sets = [[i] for i in range(unclued_shaded_region_id)]

    s = utils.shading.RectangularGridShadingSolver(E.R, E.C)

    rs = utils.regions.RectangularGridRegionSolver(E.R, E.C, max_num_regions = max_num_regions,
        region_symbol_sets = region_symbol_sets)

    # --- Region size constraint (see utils.regions.set_region_size) ---
    min_region_size = 1

    # Keep track, for each cell, of the size of the region it belongs to.
    region_size = [[IntVar(min_region_size, max_region_size) for c in range(E.C)] for r in range(E.R)]
    # To count cells in a group, create a region_id of IntVars, where each value
    # is the sum of the values that flow towards it, plus one.
    upstream = [[IntVar(0, max_region_size) for c in range(E.C)] for r in range(E.R)]
    for r in range(E.R):
        for c in range(E.C):
            upstream_count = IntVar(0)

            if r > 0:
                upstream_count += cond(rs.parent[r-1][c] == 'v', upstream[r-1][c], 0)

            if r < E.R-1:
                upstream_count += cond(rs.parent[r+1][c] == '^', upstream[r+1][c], 0)

            if c > 0:
                upstream_count += cond(rs.parent[r][c-1] == '>', upstream[r][c-1], 0)

            if c < E.C-1:
                upstream_count += cond(rs.parent[r][c+1] == '<', upstream[r][c+1], 0)

            # if cell is part of some region, it must obey the upstream counting rule;
            # otherwise, its count is 0.
            require(cond(var_in(rs.region_id[r][c], fake_region_ids), upstream[r][c] == 0, upstream[r][c] == upstream_count + 1))

            # associate upstream grid with region_size grid at the roots.
            if (r, c) in E.clues:
                v = E.clues[(r, c)]
                if len(coordinates_possibly_in_same_region[(r, c)]) > 0:
                    require(
                        ((rs.parent[r][c] == '.') & (rs.region_id[r][c] == clue_cell_id[(r, c)]) & (upstream[r][c] == v)) |
                        ((rs.parent[r][c] != '.') & var_in(rs.region_id[r][c], set(clue_cell_id[(y, x)] for (y, x) in coordinates_possibly_in_same_region[(r, c)])))
                    )
                else:
                    require((rs.parent[r][c] == '.') & (rs.region_id[r][c] == clue_cell_id[(r, c)]) & (upstream[r][c] == v))

    # Require that ((ID is used by at least 1 clue) == (exactly 1 region root)) except for fake regions
    for i in range(unclued_shaded_region_id):
        require(
            at_least(1, [rs.grid[r][c] == i for (r, c) in E.clues]) ==
            sum_bools(1, [(rs.grid[r][c] == i) & (rs.parent[r][c] == '.') for r in range(E.R) for c in range(E.C)])
        )

    # Some additional things required to make this work
    for (r, c) in E.clues:
        require(rs.grid[r][c] != 'x')
        require(~var_in(rs.grid[r][c], fake_region_ids))

    # --- Some extra constraints to help Claspy ---
    # If a cell is not a clue it cannot be root.
    for r in range(E.R):
        for c in range(E.C):
            if (r, c) not in E.clues:
                require(rs.parent[r][c] != '.')
    # If a cell is root, it must have its own clue_cell_id
    for (r, c) in E.clues:
        require((rs.grid[r][c] == clue_cell_id[(r, c)]) | (rs.parent[r][c] != '.'))

    # --- Shaded regions must be rectangles ---
    for r in range(E.R-1):
        for c in range(E.C-1):
            require(~sum_bools(3, [s.grid[r][c], s.grid[r+1][c], s.grid[r][c+1], s.grid[r+1][c+1]]))

    # --- Unshaded regions cannot be rectangles ---
    # This one's a bit trickier. The core idea is each white cell has to be connected to a (2x2) L-shape.
    unshaded_atoms = [[Atom() for c in range(E.C)] for r in range(E.R)]
    for r in range(E.R-1):
        for c in range(E.C-1):
            # If the unshaded L-center is the top left, it is known proven.
            unshaded_atoms[r][c].prove_if(~s.grid[r][c] & ~s.grid[r][c+1] & ~s.grid[r+1][c] & s.grid[r+1][c+1])
            unshaded_atoms[r][c+1].prove_if(~s.grid[r][c] & ~s.grid[r][c+1] & s.grid[r+1][c] & ~s.grid[r+1][c+1]) # top right
            unshaded_atoms[r+1][c].prove_if(~s.grid[r][c] & s.grid[r][c+1] & ~s.grid[r+1][c] & ~s.grid[r+1][c+1]) # bottom left
            unshaded_atoms[r+1][c+1].prove_if(s.grid[r][c] & ~s.grid[r][c+1] & ~s.grid[r+1][c] & ~s.grid[r+1][c+1]) # bottom right

    for r in range(E.R):
        for c in range(E.C):
            for (y, x) in utils.grids.get_neighbors(E.R, E.C, r, c):
                unshaded_atoms[r][c].prove_if(unshaded_atoms[y][x] & ~s.grid[y][x] & ~s.grid[r][c])

            require(unshaded_atoms[r][c] | s.grid[r][c]) # Every cell is either shaded or unshaded-L-connected-proven.

    # --- Associate region grid with shading grid ---
    for r in range(E.R):
        for c in range(E.C):
            # All cases
            for (y, x) in utils.grids.get_neighbors(E.R, E.C, r, c):
                # Neighbors have same shading iff regions are equal
                require((s.grid[r][c] == s.grid[y][x]) == (rs.grid[r][c] == rs.grid[y][x]))

            # Special cases
            require(s.grid[r][c] | (rs.grid[r][c] != unclued_shaded_region_id))
            require(~s.grid[r][c] | (rs.grid[r][c] != unclued_unshaded_region_id))
            # Other cases
            for i in range(unclued_shaded_region_id):
                is_shaded = BoolVar()
                require((s.grid[r][c] == is_shaded) | (rs.grid[r][c] != i))

    # --- Generate solution ---
    # Using s.solutions() works fine! But unfortunately this solver's really slow and I was trying to
    # see if providing some more constraints here could make it go faster...

    def generate_solution():
        return utils.solutions.get_grid_solution(s.grid, lambda r, c: 'darkgray' if s.grid[r][c].value() else '')

    def avoid_duplicate_solution():
        x = BoolVar(True)
        for r in range(E.R):
            for c in range(E.C):
                x = x & (s.grid[r][c] == s.grid[r][c].value())
        require(~x)
        x = BoolVar(True)
        for r in range(E.R):
            for c in range(E.C):
                x = x & (rs.grid[r][c] == rs.grid[r][c].value())
        require(~x)

    return utils.solutions.get_all_solutions(generate_solution, avoid_duplicate_solution)

def decode(solutions):
    return utils.decode(solutions)

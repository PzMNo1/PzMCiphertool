from .claspy import *
from . import utils
from .utils.borders import *
from .utils.loops import *
from .utils.regions import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s, has_borders = True)

def solve(E):
    loop_solver = utils.RectangularGridLoopSolver(E.R, E.C)
    rooms = full_bfs(E.R, E.C, E.edges)
    region_type = [[MultiVar('m', 's') for r in range(E.R)] for c in range(E.C)]

    # In each room, either: 
    # - hit all moons + no suns
    # - hit all suns + no moons
    for room in rooms:
        has_moons, has_suns = False, False
        hit_all_moons, hit_all_suns = BoolVar(True), BoolVar(True)
        hit_at_least_1_moon, hit_at_least_1_sun = BoolVar(False), BoolVar(False)
        for (r, c) in room:
            if (r, c) in E.clues:
                is_nonempty = loop_solver.grid[r][c] != ''
                if E.clues[(r, c)] == 'm':
                    has_moons = True
                    hit_all_moons &= is_nonempty
                    hit_at_least_1_moon |= is_nonempty
                    require(is_nonempty == (region_type[r][c] == 'm'))
                elif E.clues[(r, c)] == 's':
                    has_suns = True
                    hit_all_suns &= is_nonempty
                    hit_at_least_1_sun |= is_nonempty
                    require(is_nonempty == (region_type[r][c] == 's'))
        if not (has_moons or has_suns):
            raise ValueError('Every region must contain at least 1 moon or sun.')
        require(sum_bools(1, [has_moons & hit_all_moons, has_suns & hit_all_suns]))
        require(sum_bools(1, [hit_at_least_1_moon, hit_at_least_1_sun]))

    # Make sure that each region is marked correctly as an m or s region
    for r in range(1, E.R):
        for c in range(E.C):
            require((region_type[r-1][c] == region_type[r][c]) | ((r, c, Direction.TOP) in E.edges))
            require((region_type[r-1][c] != region_type[r][c]) | 
                    ~(var_in(loop_solver.grid[r][c], UP_CONNECTING) & ((r, c, Direction.TOP) in E.edges)))
    for r in range(E.R):
        for c in range(1, E.C):
            require((region_type[r][c-1] == region_type[r][c]) | ((r, c, Direction.LEFT) in E.edges))
            require((region_type[r][c-1] != region_type[r][c]) | 
                    ~(var_in(loop_solver.grid[r][c], LEFT_CONNECTING) & ((r, c, Direction.LEFT) in E.edges)))

    # Basic rules
    loop_solver.loop({})
    loop_solver.no_reentrance(rooms)
    loop_solver.hit_every_region(rooms)

    return loop_solver.solutions()
    
def decode(solutions):
    return utils.decode(solutions)

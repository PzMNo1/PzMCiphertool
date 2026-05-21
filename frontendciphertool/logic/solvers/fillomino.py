from .claspy import *
from . import utils
import time

def encode(string):
    return utils.encode(string)

def solve(E):
    def unclued_areas_bfs(clues, R, C):
        region_id = {}
        id_to_pts = {}
        num = 0

        # divide unclued cells into connected regions with distinct id's
        for r in range(R):
            for c in range(C):
                if (r,c) in region_id or (r,c) in clues:
                    continue
                else:
                    region_id[(r,c)] = num # do BFS for id = [num]
                    id_to_pts[num] = [(r,c)]
                    frontier = [(r,c)]
                    while frontier != []:
                        new_frontier = []
                        for (r1,c1) in frontier:
                            for (dr,dc) in [(1,0),(-1,0),(0,1),(0,-1)]:
                                r0, c0 = r1+dr, c1+dc
                                if 0 <= r0 < R and 0 <= c0 < C and \
                                    (r0,c0) not in clues and (r0,c0) not in region_id:
                                    region_id[(r0,c0)] = num
                                    id_to_pts[num].append((r0,c0))
                                    new_frontier.append((r0,c0))
                        frontier = new_frontier
                    num += 1

        max_region_sizes = {}
        for n, pts in id_to_pts.items():
            max_size = len(pts)
            for (r,c) in pts:
                for (dr,dc) in [(1,0),(-1,0),(0,1),(0,-1)]:
                    r0, c0 = r+dr, c+dc
                    if (r0,c0) in clues:
                        max_size = max(max_size, clues[(r0,c0)])
            for pt in pts:
                max_region_sizes[pt] = max_size
        return max_region_sizes

    def find_independent_set(S, adj):
        indep = []
        for x in S:
            if all(not adj(x,y) for y in indep):
                indep.append(x)
        return indep

    n = E.R * E.C
    set_max_val(n)

    distinct_clues = set(E.clues.values())
    max_clue = max(distinct_clues, default=n)

    indep_bound = n # calculate a bound on the maximum size of a hidden region
    for clue_num in distinct_clues:
        clues = list(filter(lambda clue: E.clues[clue] == clue_num, E.clues))
        indep = find_independent_set(clues, lambda x,y: abs(x[0]-y[0])+abs(x[1]-y[1])<clue_num)
        indep_bound -= len(indep) * clue_num
    max_region_size = max(indep_bound, max_clue)

    region_id = utils.RectangularGrid(E.R, E.C, lambda r,c: IntVar(0, E.C*r+c))
    # this forces each root to be the topleft-most cell (i.e., first in row-major order) of its region
    
    # refine possibilities for region_id for each clue cell
    for (r,c) in E.clues:
        region_id_poss = []
        clue_val = E.clues[(r,c)]
        if clue_val <= r: # clue's region can't reach the top row
            r0 = r - clue_val + 1
            # row-major-first cell reachable is (r0,c)
            require(region_id[r][c] >= E.C*r0 + c)
        else: # clue's region can reach the top row
            c0 = c - (clue_val-r-1)
            if c0 > 0: # row-major-first cell reachable is (0,c0), to the right of (0,0)
                require(region_id[r][c] >= c0)

    bfs_max_region_sizes = unclued_areas_bfs(E.clues, E.R, E.C)
    region_size = utils.RectangularGrid(E.R, E.C, 
        lambda r,c:
            IntVar(E.clues[(r,c)]) if (r,c) in E.clues else \
            IntVar(1, min(bfs_max_region_sizes[(r,c)],max_region_size))
    )

    # flow is a grid of Atoms used to ensure that all cells are
    # connected along the parent pointer field to a root cell.
    parent = [[MultiVar('^','v','>','<','.') for c in range(E.C)] for r in range(E.R)]
    flow = [[Atom() for c in range(E.C)] for r in range(E.R)]
    for r in range(E.R):
        for c in range(E.C):
            # The root cell is proven.
            prove_condition = (parent[r][c] == '.')

            # All unshaded cells must be proven by following the flow backwards from the root.
            if r > 0:
                prove_condition |= ((parent[r][c] == '^') & flow[r-1][c])
            if r < E.R-1:
                prove_condition |= ((parent[r][c] == 'v') & flow[r+1][c])
            if c > 0:
                prove_condition |= ((parent[r][c] == '<') & flow[r][c-1])
            if c < E.C-1:
                prove_condition |= ((parent[r][c] == '>') & flow[r][c+1])

            flow[r][c].prove_if(prove_condition)
            require(flow[r][c])

    for r in range(E.R):
        for c in range(E.C):
            if r > 0:
                require((parent[r][c] != '^') | (region_size[r][c] == region_size[r-1][c]))
            if r < E.R-1:
                require((parent[r][c] != 'v') | (region_size[r][c] == region_size[r+1][c]))
            if c > 0:
                require((parent[r][c] != '<') | (region_size[r][c] == region_size[r][c-1]))
            if c < E.C-1:
                require((parent[r][c] != '>') | (region_size[r][c] == region_size[r][c+1]))

    # To count cells in a group, create a grid of IntVars, where each value
    # is the sum of the values that flow towards it, plus one.
    upstream = [[IntVar(0, max_region_size) for c in range(E.C)] for r in range(E.R)]
    for r in range(E.R):
        for c in range(E.C):
            upstream_count = IntVar(1)
            if r > 0: # update upstream count
                upstream_count += cond(parent[r-1][c] == 'v', upstream[r-1][c], 0)
            if r < E.R-1:
                upstream_count += cond(parent[r+1][c] == '^', upstream[r+1][c], 0)
            if c > 0:
                upstream_count += cond(parent[r][c-1] == '>', upstream[r][c-1], 0)
            if c < E.C-1:
                upstream_count += cond(parent[r][c+1] == '<', upstream[r][c+1], 0)
                
            # all cells must obey upstream counting rule
            require(upstream[r][c] == upstream_count)
            require((parent[r][c] != '.') | (upstream[r][c] == region_size[r][c]))

    # if adjacent cells have the same region size, they must be part of the same region
    for r in range(E.R):
        for c in range(E.C):
            require((region_id[r][c] == E.C*r + c) | (parent[r][c] != '.')) # root cells must have different region IDs
            if r > 0:
                require((region_id[r-1][c] == region_id[r][c]) | (region_size[r-1][c] != region_size[r][c]))
            if c > 0:
                require((region_id[r][c-1] == region_id[r][c]) | (region_size[r][c-1] != region_size[r][c]))

    sols = utils.get_all_grid_solutions(region_size)
    return sols
    
def decode(solutions):
    return utils.decode(solutions)

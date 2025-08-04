from .claspy import *
from . import utils
from .utils import *

def encode(string):
    return utils.encode(string,
        clue_encoder = lambda s : s,
        outside_clues = '1001')

def solve(E):
    '''
    Given an encoding of a Nonogram, as would be returned by the
    encode_nonogram function,

    Returns a list of lists, of maximum size MAX_SOLUTIONS_TO_FIND,
    where each inner list contains 1-indexed coordinates of shaded cells.
    '''
    if len(E.top) + len(E.left) == 0:
        raise ValueError('No clues provided.')
    
    top_clues = {}
    for c in E.top:
        top_clues[c] = [int(clue) if clue != '?' else '?' for clue in E.top[c].split()]

    left_clues = {}
    for r in E.left:
        left_clues[r] = [int(clue) if clue != '?' else '?' for clue in E.left[r].split()]
    
    # reset clasp, & set max IntVar value to max row / col coordinate
    reset()

  #  set_max_val(max(E.R,E.C))
  # this line is problematic if the clue numbers are absurdly large :(
  # so i commented it out for now --michael 6/22

    shading_solver = RectangularGridShadingSolver(E.R, E.C)

    # --- SATISFY ROW CLUES ---
    for r in left_clues:
        # make lists of (inclusive) start and end points of runs
        start_points = [IntVar(0, E.C-1) for clue in range(len(left_clues[r]))]
        end_points = []
        for clue_idx in range(len(start_points)):
            # if we have a mystery clue,
            if left_clues[r][clue_idx] == '?':
                # the end point has to be greater than or equal to the start
                end_point = IntVar(0, E.C-1)
                require(start_points[clue_idx] <= end_point)
            # if we have a known run length,
            else:
                end_point = start_points[clue_idx] + left_clues[r][clue_idx] - 1 
            # the run can't leave the grid
            if clue_idx == len(start_points)-1:
                require(end_point < E.C)
            # and there must be whitespace between consecutive runs
            else:
                require(end_point + 1 < start_points[clue_idx + 1])
            end_points.append(end_point)

        if left_clues[r] != []:
            # apply the shading rules
            for c in range(E.C):
                is_in_some_run = False
                for clue_idx in range(len(start_points)):
                    is_in_some_run |= ((start_points[clue_idx] <= c) & \
                                           (c <= end_points[clue_idx]))
                # a cell is shaded IFF it belongs to a run
                require(shading_solver.grid[r][c] == is_in_some_run)

    # --- SATISFY COLUMN CLUES ---
    for c in top_clues:
        start_points = [IntVar(0, E.R-1) for clue in range(len(top_clues[c]))]
        end_points = []
        for clue_idx in range(len(start_points)):
            if top_clues[c][clue_idx] == '?':
                end_point = IntVar(0, E.R-1)
                require(start_points[clue_idx] <= end_point)
            else:
                end_point = start_points[clue_idx] + top_clues[c][clue_idx] - 1
            if clue_idx == len(start_points)-1:
                require(end_point < E.R)
            else:
                require(end_point + 1 < start_points[clue_idx + 1])
            end_points.append(end_point)

        if top_clues[c] != []:
            for r in range(E.R):
                is_in_some_run = False
                for clue_idx in range(len(start_points)):
                    is_in_some_run |= ((start_points[clue_idx] <= r) & \
                                           (r <= end_points[clue_idx]))
                require(shading_solver.grid[r][c] == is_in_some_run)
                
    return shading_solver.solutions()

def decode(solutions):
    return utils.decode(solutions)

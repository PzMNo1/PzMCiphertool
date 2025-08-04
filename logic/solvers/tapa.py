from .claspy import *
from . import utils
from .utils.shading import *
from .utils.solutions import *
import itertools

def encode(string):
    return utils.encode(string, clue_encoder = lambda s: s)

def parse_shading(shading):
    '''
        Returns the Tapa clue that a ring of 8 cells
        corresponds to, digits sorted in increasing order.
        For example,
            shading = [T,F,T,T,T,F,F,T]
        should output [2, 3]. As a special case,
        outputs [0] if shading is all False.
    '''
    if all(shading): # shading is all True
        return [8]
    
    # rotate so that the first spot is False
    idx = shading.index(False)
    shading = shading[idx:] + shading[:idx]

    # now `clue` is the lengths of consecutive runs of `True` in shading
    clue = []
    curr_num = 0
    for b in shading:
        if b: # shaded, add to shaded string
            curr_num += 1
        else: # unshaded, end current shaded string
            if curr_num > 0:
                clue.append(curr_num)
            curr_num = 0
    if curr_num > 0: # add last string
        clue.append(curr_num)

    if clue == []:
        clue = [0]        
    return sorted(clue)

def pattern_matches(q_pattern, pattern):
    '''
        Determines if q_pattern is pattern, but with
        some (nonzero) numbers replaced with '?'.
        For example,
            q_pattern = [1, '?', 3] and
            pattern = [1, 1, 3]
        returns True.

        Here q_pattern is a clue in the puzzle, and
        pattern is the result of parsing a particular shading candidate.
    '''
    if q_pattern == [0]: # note: [0] doesn't match ['?']
        return pattern == [0]
    else:
        return len(q_pattern) == len(pattern) and \
            all(q_pattern.count(n) <= pattern.count(n) for n in range(1, 9))

def solve(E):
    shading_solver = RectangularGridShadingSolver(E.R, E.C)

    shading_solver.white_clues(E.clues)
    shading_solver.black_connectivity()
    shading_solver.no_black_2x2()

    # enforce Tapa clues
    for (r,c), clue in E.clues.items():
        adj_indices = [ (r+dr,c+dc) for (dr,dc) in
            ((0,1),(1,1),(1,0),(1,-1),(0,-1),(-1,-1),(-1,0),(-1,1))
        ]
        cond = False # condition that this clue is fulfilled by some shading
        for shading in itertools.product([True,False], repeat=8):
            if pattern_matches(clue, parse_shading(shading)): # check if this shading works
                this_cond = True # build condition for this shading
                for k, idx in enumerate(adj_indices):
                    if is_valid_coord(E.R, E.C, *idx):
                        this_cond &= (shading_solver.grid[idx] == shading[k])
                    else: # trying to handle a cell off the edge
                        if shading[k]: # we want the cell off the edge to be shaded? impossible, give up
                            this_cond = False
                            break
                        # we want the cell off the edge to be unshaded? great, nothing to do, move on
                cond |= this_cond
        require(cond)
    return shading_solver.solutions()

def decode(solutions):
    return utils.decode(solutions)
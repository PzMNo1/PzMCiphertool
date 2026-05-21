from .borders import *
from enum import Enum
import urllib.parse
import json

class Encoding:
    def __init__(self, rows=None, cols=None,
            clue_cells=None, params=None, edge_ids=None,
            top_clues=None, right_clues=None, bottom_clues=None, left_clues=None):
        self.rows = rows
        self.r = rows
        self.R = rows
        self.cols = cols
        self.c = cols
        self.C = cols
        self.clues = clue_cells
        self.clue_cells = clue_cells
        self.params = params
        self.edge_ids = edge_ids
        self.edges = edge_ids
        self.top_clues = top_clues
        self.top = top_clues
        self.right_clues = right_clues
        self.right = right_clues
        self.bottom_clues = bottom_clues
        self.bottom = bottom_clues
        self.left_clues = left_clues
        self.left = left_clues

def default_clue_encoder(string):
    '''
    If 'string' is a number, return its int value.
    If 'string' is '?' or '' or a color name or a single letter, return string.
    Otherwise, raise an error.
    '''
    if isinstance(string, list):
        return string
    if string.isnumeric():
        return int(string)
    elif string in ['?', '']:
        return string
    elif string in ['black','darkgray','lightblue']:
        return string
    elif string.isalpha() and len(string) == 1:
        return string
    else:
        raise RuntimeError('Invalid input')

def grid_to_rc(i, j):
    return i//2, j//2

def unquote_plus(value):
    if isinstance(value, list):
        return [unquote_plus(x) for x in value]
    elif isinstance(value, str):
        return urllib.parse.unquote_plus(value)
    else:
        return value

def encode(string,
           clue_encoder = default_clue_encoder,
           has_params = False, # currently useless 5/21/21 --michael
           has_borders = False,
           outside_clues = '0000'):
    '''
    Given a JSON object representing a puzzle,
    a clue_encoder function which interprets the clues' string values,
    and some parameters:
     - has_params = True iff the puzzle has parameters
     - has_borders = True iff the puzzle has borders / regions
     as part of its input
     - outside_clues = a binary string which specifies the presence
     of outside clues in the perimeter, in a top, right, bottom, left
     ordering, where a 0 represents no border in that location
    '''
    json_obj = json.loads(string)
    
    # default values
    params, edge_ids, top_clues, right_clues, bottom_clues, left_clues = [None]*6
    
    json_grid = json_obj['grid']
    json_params = json_obj['param_values']
    json_properties = json_obj['properties']
    
    if 'r' in json_params and 'c' in json_params:
        rows, cols = int(json_params['r']), int(json_params['c'])
    elif 'n' in json_params:
        rows, cols = int(json_params['n']), int(json_params['n'])
    else: # sudoku (8/10/2020)
        rows, cols = 9, 9
    clue_cells = {}
    
    if json_params:
        params = json_params.copy()
        if 'r' in params:
            del params['r']
        if 'c' in params:
            del params['c']
        if 'n' in params:
            del params['n']
    
    if has_borders:
        edge_ids = set()
        
    for i in range(2*(rows+1)):
        for j in range(2*(cols+1)):
            coord_str = f'{i},{j}'
            if coord_str in json_grid:
                if (i%2, j%2) == (1, 1): # cell coords
                    if i<2*rows and j<2*cols:
                        clue_cells[grid_to_rc(i,j)] = clue_encoder(unquote_plus(json_grid[coord_str]))
                else: # border coords
                    edge_ids.add(get_edge_id_from_border_coord(rows, cols, i, j))
    
    # add outside borders manually, just in case
    if has_borders:
       for r in range(rows):
           edge_ids.add((r, 0, Direction.LEFT))
           edge_ids.add((r, cols-1, Direction.RIGHT))
       for c in range(cols):
           edge_ids.add((0, c, Direction.TOP))
           edge_ids.add((rows-1, c, Direction.BOTTOM))
    
    outside_clue_string = json_properties['outside']
    if outside_clue_string[0] == '1':
        top_clues = {}
    if outside_clue_string[1] == '1':
        right_clues = {}
    if outside_clue_string[2] == '1':
        bottom_clues = {}
    if outside_clue_string[3] == '1':
        left_clues = {}
        
    if top_clues != None:
        for j in range(2*(cols+1)):
            input_coord_string = '{},{}'.format(-1, j)
            if input_coord_string in json_grid:
                top_clues[j//2] = clue_encoder(unquote_plus(json_grid[input_coord_string]))
    
    if right_clues != None:
        for i in range(2*(rows+1)):
            input_coord_string = '{},{}'.format(i, 2*cols+1)
            if input_coord_string in json_grid:
                right_clues[i//2] = clue_encoder(unquote_plus(json_grid[input_coord_string]))
    
    if bottom_clues != None:
        for j in range(2*(cols+1)):
            input_coord_string = '{},{}'.format(2*rows+1, j)
            if input_coord_string in json_grid:
                bottom_clues[j//2] = clue_encoder(unquote_plus(json_grid[input_coord_string]))
    
    if left_clues != None:
        for i in range(2*(rows+1)):
            input_coord_string = '{},{}'.format(i, -1)
            if input_coord_string in json_grid:
                left_clues[i//2] = clue_encoder(unquote_plus(json_grid[input_coord_string]))

    return Encoding(rows, cols, clue_cells,
                params, edge_ids,
                top_clues, right_clues, bottom_clues, left_clues)

def decode(solutions):
    '''
    Given a list of solutions,
    Return a string of the format:
        {
            (solution #): (solution),
            'num_solutions': (# of solutions),
        }.
    '''
    solution_str = '{'
    for i, solution in enumerate(solutions):
        solution_str += f'"{i+1}":{json.dumps(solution)},'
    solution_str += f'"num_solutions":{len(solutions)}'
    solution_str += '}'
    return solution_str

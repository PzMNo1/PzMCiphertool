from ..claspy import *
from datetime import datetime

MAX_SOLUTIONS_TO_FIND = 10

def rc_to_grid(r, c):
    return f'{2*r+1},{2*c+1}'

def default_equality_function(x, y):
    return x == y
    
def get_all_solutions(generate_solution, avoid_duplicate_solution, debug_function = None):
    solutions = []
    #print(f'starting search - it\'s {datetime.now()}', flush=True)
    for i in range(MAX_SOLUTIONS_TO_FIND):
        if claspy_solve():
    #        print(f'solution {i+1} found at {datetime.now()}', flush=True)
            solutions.append(generate_solution())
            avoid_duplicate_solution()
            if debug_function:
                debug_function()
        else:
            break
    #print(f'all solutions found - it\'s {datetime.now()}', flush=True)
    return solutions

def get_grid_solution(grid, format_function = None):
        
    if not format_function:
        format_function = lambda r, c: grid[r][c].value()
        
    solution = {}
    for r in range(len(grid)):
        for c in range(len(grid[r])):
            cell_output = format_function(r, c)
            if cell_output != '':
                solution[rc_to_grid(r,c)] = cell_output
    return solution
    
def avoid_duplicate_grid_solution(grid, equality_function = default_equality_function):
    x = BoolVar(True)
    for r in range(len(grid)):
        for c in range(len(grid[r])):
            x = x & equality_function(grid[r][c], grid[r][c].value())
    require(~x)

def get_all_grid_solutions(grid,
        equality_function = default_equality_function,
        format_function = None,
        debug_function = None):
        
    def generate_solution():
        return get_grid_solution(grid, format_function)
    
    def avoid_duplicate_solution():
        return avoid_duplicate_grid_solution(grid, equality_function)

    return get_all_solutions(generate_solution, avoid_duplicate_solution, debug_function)


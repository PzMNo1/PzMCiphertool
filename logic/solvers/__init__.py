from os.path import dirname, basename, isfile, join
import glob

modules = glob.glob(join(dirname(__file__), '*.py'))
submodules = [basename(f)[:-3] for f in modules if isfile(f) and not f.endswith('__init__.py')]
for submodule in submodules:
    exec(f'import solvers.{submodule}')
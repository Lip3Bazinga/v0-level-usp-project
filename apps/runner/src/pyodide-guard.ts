/**
 * Código Python executado pelo worker do Pyodide fora do harness: bloqueios instalados
 * depois do aquecimento (antes de qualquer código do aluno) e, na política `reuse`, a
 * fotografia e a restauração do interpretador entre lotes. Tudo roda num namespace
 * privado (um dicionário que só o JS referencia): nada disto fica em `sys.modules`,
 * em `__main__` nem alcançável por atributos a partir do código do aluno.
 */

/**
 * Fecha as pontes para o JavaScript e os caminhos até código nativo que fariam o
 * aluno sair do interpretador. Devolve os nomes das referências a objetos JS apagadas.
 *
 * - `js`/`pyodide_js` deixam de existir (finder removido, registro limpo, `None` em
 *   `sys.modules`) e toda referência a objetos JS guardada em módulos (`JsProxy`) é
 *   apagada — qualquer `JsProxy` alcançável daria `.constructor` → `Function` do host;
 * - as fábricas de `JsProxy` (`to_js`, `create_proxy`, `run_sync`, `run_js`...) somem;
 * - `_ctypes` (compilado no núcleo do Pyodide) permitiria ler e escrever a memória do
 *   interpretador — inclusive o nonce do harness no modo estrito — e chamar as
 *   importações do wasm (`emscripten_run_script` = `eval` no host): fica inacessível
 *   por `import`, `importlib` e `_imp.create_builtin` (o original só existe no fecho
 *   do audit hook, que não é alcançável de Python);
 * - o ambiente fica vazio (como no WASI) e o SIGINT volta ao handler padrão, que é o
 *   que transforma o buffer de interrupção em `KeyboardInterrupt`.
 */
export const PYODIDE_LOCKDOWN_SOURCE = String.raw`
def _lockdown():
    import sys, gc, os, signal, _imp, types
    import _pyodide._importhook as hook
    import pyodide.ffi, pyodide.code, _pyodide_core
    from pyodide.ffi import JsProxy

    sys.meta_path = [finder for finder in sys.meta_path if not isinstance(finder, hook.JsFinder)]
    hook.jsfinder.jsproxies.clear()
    for name, module in list(sys.modules.items()):
        if isinstance(module, JsProxy):
            sys.modules[name] = None
    for name in ("js", "pyodide_js", "_ctypes", "ctypes", "_testcapi", "_testinternalcapi", "_testlimitedcapi", "_testbuffer", "_xxtestfuzz"):
        sys.modules[name] = None

    removed = []
    for name, module in list(sys.modules.items()):
        namespace = getattr(module, "__dict__", None)
        if type(namespace) is not dict:
            continue
        for key, value in list(namespace.items()):
            if isinstance(value, JsProxy):
                del namespace[key]
                removed.append(name + "." + key)

    for key in ("to_js", "create_proxy", "create_once_callable", "run_sync", "can_run_sync", "destroy_proxies", "jsnull", "register_js_module", "unregister_js_module"):
        pyodide.ffi.__dict__.pop(key, None)
        _pyodide_core.__dict__.pop(key, None)
    pyodide.code.__dict__.pop("run_js", None)
    hook.__dict__.pop("register_js_module", None)
    hook.__dict__.pop("unregister_js_module", None)

    os.environ.clear()
    signal.signal(signal.SIGINT, signal.default_int_handler)

    blocked_modules = frozenset({"_ctypes", "ctypes", "js", "pyodide_js", "_remote_debugging", "xxsubtype"})
    blocked_prefixes = ("_test", "_xx")
    create_event = "levelusp.pyodide.create_builtin"
    original_create_builtin = _imp.create_builtin
    Namespace = types.SimpleNamespace
    refused = "módulo indisponível no motor python-dados: %s"

    def is_blocked(name):
        if type(name) is not str:
            return True
        root = name.split(".")[0]
        return root in blocked_modules or root.startswith(blocked_prefixes)

    # O original de _imp.create_builtin só existe no fecho deste hook, que não é
    # alcançável a partir do Python (não há API para listar hooks).
    def guard(event, args):
        if event == "import":
            if is_blocked(args[0]):
                raise ImportError(refused % args[0])
            return
        if event == create_event:
            box = args[0]
            if type(box) is not list or len(box) != 1:
                raise RuntimeError("introspecção do interpretador desativada")
            name = getattr(box[0], "name", None)
            if is_blocked(name):
                raise ImportError(refused % name)
            box.append(original_create_builtin(Namespace(name=name)))

    audit = sys.audit

    def create_builtin(spec):
        box = [spec]
        audit(create_event, box)
        return box[1]

    sys.addaudithook(guard)
    _imp.create_builtin = create_builtin
    gc.collect()
    return removed

_lockdown()
`

/**
 * Guarda extra dos workers reaproveitados (`reuse`): sem novos audit hooks (um hook do
 * aluno persistiria para os lotes seguintes) e sem introspecção do gc (é o único caminho
 * até a fotografia do interpretador, guardada num namespace privado).
 */
export const PYODIDE_REUSE_GUARD_SOURCE = String.raw`
def _install_reuse_guard():
    import sys
    blocked = frozenset({"sys.addaudithook", "gc.get_objects", "gc.get_referrers", "gc.get_referents"})

    def guard(event, args):
        if event in blocked:
            raise RuntimeError("indisponível em workers reaproveitados do motor python-dados")

    sys.addaudithook(guard)

_install_reuse_guard()
`

/**
 * Varredura de diagnóstico: devolve a lista (vazia se tudo certo) de `JsProxy` ainda
 * alcançáveis por contêineres vivos (dicionários, listas, tuplas, células de fecho).
 * Usada pelo autoteste do motor e pelos testes de ataque.
 */
export const PYODIDE_PROXY_SCAN_SOURCE = String.raw`
def _scan_proxies():
    import gc
    from pyodide.ffi import JsProxy
    found = []
    for candidate in gc.get_objects():
        if isinstance(candidate, JsProxy):
            found.append("objeto:" + type(candidate).__name__)
        elif type(candidate) is dict:
            found.extend("dict:" + repr(key)[:60] for key, value in list(candidate.items()) if isinstance(value, JsProxy))
        elif type(candidate) in (list, tuple):
            found.extend("sequência" for value in candidate if isinstance(value, JsProxy))
        elif type(candidate).__name__ == "cell":
            try:
                if isinstance(candidate.cell_contents, JsProxy):
                    found.append("fecho")
            except ValueError:
                pass
    return found

_scan_proxies()
`

/**
 * Fotografia do interpretador depois do aquecimento (política `reuse`): dicionário de
 * cada módulo, dicionário das classes definidas em módulos e código/defaults das funções
 * de módulos e classes, mais os singletons mutáveis conhecidos (`sys.path`, `os.environ`,
 * filtros de `warnings`, opções do numpy). As referências aos builtins são capturadas
 * aqui, antes de qualquer código do aluno, e usadas pela restauração.
 */
export const PYODIDE_SNAPSHOT_SOURCE = String.raw`
import sys, os, gc, types, builtins, warnings, signal, atexit

_builtins = (dict, list, tuple, set, type, len, id, isinstance, getattr, setattr, delattr, vars, repr, str, int, float, sorted, hasattr)

def _take_snapshot():
    dict_, list_, tuple_, set_, type_, len_, id_, isinstance_, getattr_, setattr_, delattr_, vars_, repr_, str_, int_, float_, sorted_, hasattr_ = _builtins
    FunctionType = types.FunctionType
    modules, classes, functions = {}, {}, {}

    def snap_function(function):
        functions[id_(function)] = (function, function.__code__, function.__defaults__, function.__kwdefaults__, dict_(function.__dict__))

    def snap_class(cls):
        if id_(cls) in classes:
            return
        try:
            namespace = dict_(vars_(cls))
        except TypeError:
            return
        classes[id_(cls)] = (cls, namespace)
        for value in namespace.values():
            if type_(value) is FunctionType:
                snap_function(value)
            elif type_(value) in (staticmethod, classmethod) and type_(value.__func__) is FunctionType:
                snap_function(value.__func__)
            elif type_(value) is property:
                for accessor in (value.fget, value.fset, value.fdel):
                    if type_(accessor) is FunctionType:
                        snap_function(accessor)

    for name, module in list_(sys.modules.items()):
        namespace = getattr_(module, "__dict__", None)
        if type_(namespace) is not dict_:
            continue
        modules[name] = (module, dict_(namespace))
        for value in namespace.values():
            if type_(value) is FunctionType:
                snap_function(value)
            elif isinstance_(value, type_):
                snap_class(value)

    singletons = {
        "modules": dict_(sys.modules),
        "path": list_(sys.path),
        "meta_path": list_(sys.meta_path),
        "path_hooks": list_(sys.path_hooks),
        "environ": dict_(os.environ),
        "warnings": list_(warnings.filters),
        "recursion_limit": sys.getrecursionlimit(),
        "int_max_str_digits": sys.get_int_max_str_digits(),
        "cwd": os.getcwd(),
    }
    try:
        import numpy
        singletons["numpy_printoptions"] = dict_(numpy.get_printoptions())
    except ImportError:
        pass
    return (modules, classes, functions, singletons)

_snapshot = _take_snapshot()
(len(_snapshot[0]), len(_snapshot[1]), len(_snapshot[2]))
`

/**
 * Restauração entre lotes (política `reuse`): desfaz tudo o que a fotografia cobre (um
 * `numpy.mean = ...`, `pd.DataFrame.sum = ...`, `funcao.__code__ = ...`, módulos novos,
 * `sys.path`, hooks, limite de recursão, handlers de sinal, `atexit`, cwd), esvazia o
 * `sys.monitoring`, coleta o lixo (os ciclos do módulo do aluno seguram memória do
 * wasm) e roda o canário. O que a fotografia não cobre (estado de instâncias, como
 * `pd.options` e `logging.root`) é tratado pelo melhor esforço abaixo e pela reciclagem
 * periódica. Devolve `(ok, motivo)`; qualquer problema recicla o worker.
 */
export const PYODIDE_RESTORE_SOURCE = String.raw`
def _same_items(current, expected):
    dict_, list_, tuple_, set_, type_, len_, id_, isinstance_, getattr_, setattr_, delattr_, vars_, repr_, str_, int_, float_, sorted_, hasattr_ = _builtins
    if len_(current) != len_(expected):
        return False
    for key, value in expected.items():
        if current.get(key, _same_items) is not value:
            return False
    return True

def _restore_namespace(current, expected):
    dict_, list_, tuple_, set_, type_, len_, id_, isinstance_, getattr_, setattr_, delattr_, vars_, repr_, str_, int_, float_, sorted_, hasattr_ = _builtins
    for key in list_(current):
        if key not in expected:
            del current[key]
    for key, value in expected.items():
        if current.get(key, _restore_namespace) is not value:
            current[key] = value

def _restore_interpreter(canary_source):
    dict_, list_, tuple_, set_, type_, len_, id_, isinstance_, getattr_, setattr_, delattr_, vars_, repr_, str_, int_, float_, sorted_, hasattr_ = _builtins
    modules, classes, functions, singletons = _snapshot
    problems = []

    # Builtins e sys primeiro: o resto da restauração (e o canário) dependem deles.
    for name in ("builtins", "sys", "os", "gc", "warnings", "signal", "atexit"):
        module, namespace = modules[name]
        _restore_namespace(module.__dict__, namespace)

    sys.settrace(None)
    sys.setprofile(None)
    sys.setrecursionlimit(singletons["recursion_limit"])
    sys.set_int_max_str_digits(singletons["int_max_str_digits"])
    for tool in range(6):
        try:
            if sys.monitoring.get_tool(tool) is not None:
                sys.monitoring.clear_tool_id(tool)
                sys.monitoring.free_tool_id(tool)
        except Exception:
            problems.append("sys.monitoring")

    _restore_namespace(sys.modules, singletons["modules"])
    for module, namespace in modules.values():
        _restore_namespace(module.__dict__, namespace)

    for cls, namespace in classes.values():
        try:
            current = vars_(cls)
        except TypeError:
            continue
        for key in list_(current):
            if key not in namespace:
                try:
                    delattr_(cls, key)
                except (AttributeError, TypeError):
                    problems.append("classe %s.%s" % (cls.__name__, key))
        for key, value in namespace.items():
            if current.get(key, _restore_interpreter) is not value:
                try:
                    setattr_(cls, key, value)
                except (AttributeError, TypeError):
                    problems.append("classe %s.%s" % (cls.__name__, key))

    for function, code, defaults, kwdefaults, attributes in functions.values():
        if function.__code__ is not code:
            function.__code__ = code
        if function.__defaults__ is not defaults:
            function.__defaults__ = defaults
        if function.__kwdefaults__ is not kwdefaults:
            function.__kwdefaults__ = kwdefaults
        if not _same_items(function.__dict__, attributes):
            function.__dict__.clear()
            function.__dict__.update(attributes)

    sys.path[:] = singletons["path"]
    sys.meta_path[:] = singletons["meta_path"]
    sys.path_hooks[:] = singletons["path_hooks"]
    sys.path_importer_cache.clear()
    sys.argv = [""]
    os.environ.clear()
    os.environ.update(singletons["environ"])
    warnings.resetwarnings()
    warnings.filters[:] = singletons["warnings"]
    signal.signal(signal.SIGINT, signal.default_int_handler)
    atexit._clear()
    gc.enable()
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.flush()
        except Exception:
            pass
    try:
        os.chdir(singletons["cwd"])
    except OSError:
        problems.append("cwd")

    printoptions = singletons.get("numpy_printoptions")
    if printoptions is not None:
        try:
            sys.modules["numpy"].set_printoptions(**printoptions)
        except Exception:
            problems.append("numpy.set_printoptions")
    pandas = sys.modules.get("pandas")
    if pandas is not None:
        # Opção a opção: reset_option("all") importa o matplotlib (ausente no perfil dados).
        registry = getattr_(getattr_(pandas, "_config", None), "config", None)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            for key in list_(getattr_(registry, "_registered_options", None) or ()):
                try:
                    pandas.reset_option(key)
                except Exception:
                    pass
    matplotlib = sys.modules.get("matplotlib")
    if matplotlib is not None:
        try:
            matplotlib.rcdefaults()
            matplotlib.use("agg")
            pyplot = sys.modules.get("matplotlib.pyplot")
            if pyplot is not None:
                pyplot.close("all")
        except Exception:
            problems.append("matplotlib.rcdefaults")
    logging = sys.modules.get("logging")
    if logging is not None:
        try:
            for handler in list_(logging.root.handlers):
                logging.root.removeHandler(handler)
            logging.root.setLevel(logging.WARNING)
        except Exception:
            problems.append("logging")

    gc.collect()
    try:
        is_canary_ok = eval(canary_source, {"__builtins__": modules["builtins"][0]}) is True
    except Exception as error:
        is_canary_ok = False
        problems.append("canário: %s" % type_(error).__name__)
    if not is_canary_ok:
        problems.append("canário falhou")
    return (len_(problems) == 0, "; ".join(problems))
`

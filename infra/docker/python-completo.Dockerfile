# syntax=docker/dockerfile:1.7
# Imagem do motor python-completo do executor: CPython 3.14 nativo + numpy, pandas,
# scikit-learn e PyTorch (só CPU). É a imagem em que o código do ALUNO roda, num contêiner
# de uso único com gVisor, sem rede e com a raiz somente leitura (apps/runner/src/native-engine.ts).
# Não contém nada do LevelUSP: o harness e o projeto entram pela entrada padrão a cada lote.
#
#   docker build -f infra/docker/python-completo.Dockerfile -t levelusp/python-completo:local .
#   docker build -f infra/docker/python-completo.Dockerfile --build-arg WITH_TORCH=0 -t levelusp/python-completo:enxuta .
#
# WITH_TORCH=0 é a variante enxuta (sem PyTorch, ~1 GB a menos), usada pelos testes do CI.
# Versões: as do manifesto de bibliotecas (packages/contracts/src/library-manifest.ts); o teste
# apps/runner/test/library-manifest.test.ts confere os requirements*.txt contra ele. Toda roda
# é instalada com --require-hashes (SHA-256 de cada arquivo); para trocar uma versão, edite o
# .in e rode infra/docker/python-completo/travar.sh.
ARG PYTHON_IMAGE=python:3.14.10-slim-bookworm@sha256:e60ad028afdcdd14772a3d46decf0eaf616720f9102aeb4397a2045ff6718c3d

FROM ${PYTHON_IMAGE} AS build
ARG WITH_TORCH=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1 PIP_ROOT_USER_ACTION=ignore
COPY infra/docker/python-completo/requirements.txt infra/docker/python-completo/requirements-torch.txt /req/
# --only-binary: nenhum código de build de terceiros roda aqui; --no-deps: só o que está travado.
RUN pip install --prefix=/install --require-hashes --only-binary=:all: --no-deps -r /req/requirements.txt \
 && if [ "$WITH_TORCH" = "1" ]; then pip install --prefix=/install --require-hashes --only-binary=:all: --no-deps -r /req/requirements-torch.txt; fi

FROM ${PYTHON_IMAGE} AS runtime
ARG WITH_TORCH=1
# Uma thread por biblioteca numérica: o contêiner tem 1 CPU e um teto de processos/threads.
ENV OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 PYTHONDONTWRITEBYTECODE=1 HOME=/tmp
COPY --from=build /install /usr/local
# Falha o build se uma biblioteca não importa (roda incompatível com a imagem base).
RUN python3 -I -c "import numpy, pandas, sklearn, scipy; print(numpy.__version__, pandas.__version__, sklearn.__version__)" \
 && if [ "$WITH_TORCH" = "1" ]; then python3 -I -c "import torch; print(torch.__version__)"; fi \
 && mkdir /work && chmod 1777 /work
LABEL org.opencontainers.image.title="levelusp-python-completo" levelusp.torch="${WITH_TORCH}"
USER 65534:65534
WORKDIR /work
ENTRYPOINT ["python3"]

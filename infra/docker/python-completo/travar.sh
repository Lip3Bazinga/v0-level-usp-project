#!/bin/sh
# Regera requirements.txt e requirements-torch.txt (versões e SHA-256 de todas as dependências)
# a partir dos .in. Roda DENTRO da imagem base do motor, para resolver com o mesmo Python:
#
#   docker run --rm -v "$PWD/infra/docker/python-completo:/req" -w /req \
#     python:3.14.10-slim-bookworm sh travar.sh
set -eu
pip install --quiet --root-user-action=ignore pip-tools==7.5.2
pip-compile --quiet --generate-hashes --strip-extras --no-header --allow-unsafe -o requirements.txt requirements.in
pip-compile --quiet --generate-hashes --strip-extras --no-header --allow-unsafe -o requirements-torch.txt requirements-torch.in

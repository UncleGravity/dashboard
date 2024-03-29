FROM mcr.microsoft.com/devcontainers/javascript-node:0-18
# FROM node:18

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g pm2"
# RUN apt-get install nc
RUN apt-get update && sudo apt-get install netcat-openbsd -y
RUN npm install -g pm2
WORKDIR /workspaces/superscraper/
USER node
ENTRYPOINT [ "/workspaces/superscraper/superscraper-entrypoint.sh" ]
CMD [ "sleep", "infinity" ]
ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base-debian:trixie
# Build arguments
ARG BUILD_ARCH=amd64
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

ARG NODE_VERSION=24.13.0-r1
ARG CODE_SERVER_VERSION="v4.107.0"
ARG HA_CLI_VERSION="4.45.0"
ARG HA_JS_WS_SUGAR_VERSION=1.0.1-alpha.4

# Base is with nodejs and pnpm

# hadolint ignore=DL3006
FROM ${BUILD_FROM} AS base

RUN echo "Build for architecture: ${BUILD_FROM} ${BUILD_ARCH}"

# Configure locale
ENV \
    LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8 \
    PIP_BREAK_SYSTEM_PACKAGES=1

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN \
    apt-get update && \
    apt-get install -y \
        ca-certificates \
        curl \
        gpg \
        xz-utils \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_VERSION=24.13.0

RUN \
    ARCH= && dpkgArch="$(dpkg --print-architecture)" \
    && case "${dpkgArch##*-}" in \
        amd64) ARCH='x64';; \
        ppc64el) ARCH='ppc64le';; \
        s390x) ARCH='s390x';; \
        arm64) ARCH='arm64';; \
        armhf) ARCH='armv7l';; \
        i386) ARCH='x86';; \
        *) echo "unsupported architecture"; exit 1 ;; \
    esac \
    # use pre-existing gpg directory, see https://github.com/nodejs/docker-node/pull/1895#issuecomment-1550389150
    && export GNUPGHOME="$(mktemp -d)" \
    # gpg keys listed at https://github.com/nodejs/node#release-keys
    && set -ex \
    && for key in \
        5BE8A3F6C8A5C01D106C0AD820B1A390B168D356 \
        DD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7 \
        CC68F5A3106FF448322E48ED27F5E38D5B0A215F \
        8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
        890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4 \
        C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C \
        108F52B48DB57BB0CC439B2997B01419BD92F80A \
        A363A499291CBBC940DD62E41F10027AF002F8B0 \
    ; do \
        { gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key" && gpg --batch --fingerprint "$key"; } || \
        { gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key" && gpg --batch --fingerprint "$key"; } ; \
    done \
    && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" \
    && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
    && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
    && gpgconf --kill all \
    && rm -rf "$GNUPGHOME" \
    && grep " node-v$NODE_VERSION-linux-$ARCH.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
    && tar -xJf "node-v$NODE_VERSION-linux-$ARCH.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
    && rm "node-v$NODE_VERSION-linux-$ARCH.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
    # smoke tests
    && node --version \
    && npm --version \
    && rm -rf /tmp/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable


# FROM base AS final

# Copy Python requirements file
COPY requirements.txt /tmp/requirements.txt

# Copy in extensions list
COPY vscode.extensions /root/vscode.extensions

# Setup base system
ARG CODE_SERVER_VERSION="v4.107.0"
ARG HA_CLI_VERSION="4.45.0"
# hadolint ignore=SC2181, DL3008
RUN \
    apt-get update \
    \
    && apt-get install -y --no-install-recommends \
        ack=3.8.1-1 \
        libarchive-tools=3.7.4-4 \
        build-essential=12.12 \
        colordiff=1.0.21-1 \
        git=1:2.47.3-0+deb13u1 \
        iputils-ping=3:20240905-3 \
        locales=2.41-12+deb13u1 \
        mariadb-client=1:11.8.3-0+deb13u1 \
        mosquitto-clients=2.0.21-1 \
        net-tools=2.10-1.3 \
        nmap=7.95+dfsg-3 \
        openssh-client=1:10.0p1-7 \
        openssl=3.5.4-1~deb13u2 \
        python3-dev=3.13.5-1 \
        python3-venv=3.13.5-1 \
        python3=3.13.5-1 \
        unzip=6.0-29 \
        uuid-runtime=2.41-5 \
        wget=1.25.0-2 \
        zip=3.0-15 \
        zsh=5.9-8+b18 \
        less=668-1

RUN sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen
RUN  locale-gen
RUN  curl https://bootstrap.pypa.io/get-pip.py | python3
RUN  curl -J -L -o /tmp/code.tar.gz \
        "https://github.com/coder/code-server/releases/download/${CODE_SERVER_VERSION}/code-server-${CODE_SERVER_VERSION#v}-linux-$(dpkg --print-architecture).tar.gz" \
    && mkdir -p /usr/local/lib/code-server \
    && tar zxvf \
        /tmp/code.tar.gz \
        --strip 1 -C /usr/local/lib/code-server \
    \
    && ln -s /usr/local/lib/code-server/bin/code-server /usr/local/bin/code-server

RUN mkdir -p /root/.code-server/extensions \
    && uuid=$(uuidgen)

RUN while read -r ext; do \
        extention="${ext%%#*}" \
        vendor="${extention%%.*}"; \
        slug="${extention#*.}"; \
        version="${ext##*#}"; \
        \
        echo "Installing vscode extension: ${slug} by ${vendor} @ ${version} "; \
        \
        echo "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${vendor}/vsextensions/${slug}/${version}/vspackage"; \
        curl -JL --retry 5 -o "/tmp/${extention}-${version}.vsix" \
            -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36" \
            -H "x-market-user-id: ${uuid}" \
            "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${vendor}/vsextensions/${slug}/${version}/vspackage"; \
        mkdir -p "/usr/local/lib/code-server/lib/vscode/extensions/${extention}-${version}"; \
        bsdtar --strip-components=1 -xf "/tmp/${extention}-${version}.vsix" \
                    -C "/usr/local/lib/code-server/lib/vscode/extensions/${extention}-${version}" extension; \
        [ $? -ne 0 ] && exit 1; \
        sleep 1; \
    done < /root/vscode.extensions \
    && ls -la /usr/local/lib/code-server/lib/vscode/extensions/

RUN curl -L -s -o /usr/bin/ha \
        "https://github.com/home-assistant/cli/releases/download/${HA_CLI_VERSION}/ha_${BUILD_ARCH}" \
    && chmod a+x /usr/bin/ha

RUN git clone --branch master --single-branch --depth 1 \
        "https://github.com/robbyrussell/oh-my-zsh.git" ~/.oh-my-zsh \
    \
    && git clone --branch master --single-branch --depth 1 \
        "https://github.com/zsh-users/zsh-autosuggestions" \
        ~/.oh-my-zsh/custom/plugins/zsh-autosuggestions \
    && git clone --branch master --single-branch --depth 1 \
        "https://github.com/zsh-users/zsh-syntax-highlighting.git" \
        ~/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting \
    \
    && sed -i -e "s#bin/bash#bin/zsh#" /etc/passwd

RUN update-alternatives \
        --install /usr/bin/python python /usr/bin/python3 10 \
    \
    && pip3 install --no-cache-dir -r /tmp/requirements.txt

RUN apt-get purge -y --auto-remove \
        build-essential \
        libarchive-tools \
        python3-dev \
        uuid-runtime

RUN find /usr/local \
        \( -type d -a -name test -o -name tests -o -name '__pycache__' \) \
        -o \( -type f -a -name '*.pyc' -o -name '*.pyo' \) \
        -exec rm -rf '{}' +

RUN rm -fr \
        /root/.cache \
        /tmp/* \
        /var/{cache,log}/* \
        /var/lib/apt/lists/*


# Copy root filesystem
COPY rootfs /

# Copy PNPM workspace
COPY automations /automations
WORKDIR /automations
RUN pnpm install --frozen-lockfile

# COPY lib/dist /automations/lib
# RUN find /automations

# Health check
HEALTHCHECK \
    CMD curl --fail http://127.0.0.1:8099/healthz || exit 1
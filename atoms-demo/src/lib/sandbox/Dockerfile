FROM node:20-alpine

# Install basic tools
RUN apk add --no-cache \
    bash \
    git \
    curl \
    wget \
    nano \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /workspace

# Default command to keep container running
CMD ["tail", "-f", "/dev/null"]

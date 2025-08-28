FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y build-essential gdb libasan6 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY . .

# Compiler sans AddressSanitizer pour éviter les crashes
RUN make BUILD=normal

EXPOSE 4000

CMD ["./netpong_server"]

INPUT ?= slides.md
OUTPUT ?= slides.html

.PHONY: all install dependencies build run

all: run

# Install dependencies, build the CLI and its browser assets, then register
# the `mypandoc` command in npm's global bin directory for the current user.
install: build
	npm link

dependencies:
	npm install

build: dependencies
	npm run build
	chmod +x dist/mypandoc.js

run: build
	node dist/mypandoc.js --input "$(INPUT)" --output "$(OUTPUT)"

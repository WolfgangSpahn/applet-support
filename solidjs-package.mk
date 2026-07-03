# -------------------------------------------------------------------
# Shared Makefile for AIDu SolidJS packages
#
# Usage:
#
#   PACKAGE=aidu-frontend-dialog
#
#   include ../aidu-dev-tools/solidjs-package.mk
#
# Optional:
#
#   MANUALS_DIR=manuals
#
# -------------------------------------------------------------------

NPM=npm

APP_NAME=${PACKAGE}

# Convert package name to Vite lib name:
#   applet-build-an-atom -> BuildAnAtom
#   applet-bond-atoms    -> BondAtoms
define to_pascal_case
$(shell printf '%s\n' "$(1)" \
  | sed 's/^applet-//' \
  | awk -F- '{ \
      for (i = 1; i <= NF; i++) { \
        printf toupper(substr($$i,1,1)) substr($$i,2) \
      } \
    }')
endef

LIB_NAME ?= $(call to_pascal_case,$(PACKAGE))

DEV_TOOLS=../applet-support

SERVER_ROOT_PATH := /usr/share/nginx/html
APPLET_ROOT := $(SERVER_ROOT_PATH)/applets
SERVER_PATH=$(APPLET_ROOT)/$(APP_NAME)/
SERVER=aws-server

SANDBOX_VITE_CONFIG ?= dev/vite.config.ts
SANDBOX_DIST ?= dist-sandbox

.PHONY: help install clean wipe build app dev manuals deploy vite-config tailwind-config tsconfig package-json extra

help:                                     ## Show this help
	@grep -h "##" $(MAKEFILE_LIST) | grep -v grep | sed -e "s/\$$//" -e "s/##//"

# -------------------------------------------------------------------
# Vite config
# -------------------------------------------------------------------

vite-config:                              ## Generate vite.config.ts from shared template
	@echo "Generating vite.config.ts"
	@echo "PACKAGE  = $(PACKAGE)"
	@echo "LIB_NAME = $(LIB_NAME)"
	@sed "s/__LIB_NAME__/$(LIB_NAME)/g" \
		$(DEV_TOOLS)/templates/vite.config.ts.template \
		> vite.config.ts

# -------------------------------------------------------------------
# Tailwind config
# -------------------------------------------------------------------

tailwind-config:                          ## Generate tailwind.config.ts from shared template
	@echo "Generating tailwind.config.js"
	@cp $(DEV_TOOLS)/templates/tailwind.config.js.template tailwind.config.js


# -------------------------------------------------------------------
# tsconfig
# -------------------------------------------------------------------

tsconfig:                                 ## Generate tsconfig.json from shared template
	@echo "Generating tsconfig.json"
	@cp $(DEV_TOOLS)/templates/tsconfig.json.template tsconfig.json

# -------------------------------------------------------------------
# package.json
# -------------------------------------------------------------------

package-json:                             ## Generate package.json from shared template
	@test -n "$(PACKAGE)" || (echo "ERROR: PACKAGE is not set" >&2; exit 1)
	@echo "Generating package.json"
	@sed "s|__PACKAGE__|$(PACKAGE)|g" \
		$(DEV_TOOLS)/templates/package.json.template \
		> package.json

# -------------------------------------------------------------------
# extra commands
# -------------------------------------------------------------------

EXTRA ?= 0


extra:                                    ## Run applet-specific extra setup commands
ifeq ($(EXTRA),1)
	@echo "Running extra setup commands"
	$(EXTRA_COMMANDS)
else
	@echo "Skipping extra setup commands. Use EXTRA=1 to enable."
endif

# -------------------------------------------------------------------
# config
# -------------------------------------------------------------------

config:                                   ## Generate local config files
config: vite-config tailwind-config tsconfig package-json 

# -------------------------------------------------------------------
# Install
# -------------------------------------------------------------------

install:                                  ## Install dependencies
	@echo "Installing dependencies"
	@$(NPM) install

# -------------------------------------------------------------------
# Cleanup
# -------------------------------------------------------------------

clean:                                    ## Clean build artifacts and caches
	rm -rf dist
	rm -rf .vite
	rm -rf .turbo

wipe: clean                               ## Delete installed dependencies and lockfile
	rm -rf node_modules
	rm -f package-lock.json

# -------------------------------------------------------------------
# Development
# -------------------------------------------------------------------

app:                                      ## Run app sandbox in local dev mode
	@echo "Starting SolidJS dev app"
	@$(NPM) run dev -- --open

dev: app                                  ## Alias for app

# -------------------------------------------------------------------
# Build package
# -------------------------------------------------------------------

build:                                    ## Build the SolidJS package
	@echo "Building package"
	@$(NPM) run build

# -------------------------------------------------------------------
# Build sandbox
# -------------------------------------------------------------------



build-sandbox:                            ## Build deployable sandbox app
	@echo "Building sandbox app"
	$(NPM) run build -- \
		--config $(SANDBOX_VITE_CONFIG) \
		--base=/applets/$(APP_NAME)/ \
		--outDir=$(abspath $(SANDBOX_DIST))

# -------------------------------------------------------------------
# Deploy
# -------------------------------------------------------------------

deploy: build-sandbox                     ## Deploy sandbox app to server
	rsync -av --delete $(SANDBOX_DIST)/ $(SERVER):$(SERVER_PATH)

index:                                    ## Update the index.html file on the server
	SERVER="$(SERVER)" ROOT_PATH="$(ROOT_PATH)" $(DEV_TOOLS)/scripts/update-index.sh dist/server-index.html


deploy-index:                             ## Deploy the index.html file to the server
deploy-index: index
	rsync -av dist/server-index.html $(SERVER):$(SERVER_ROOT_PATH)/index.html

# -------------------------------------------------------------------
# Manuals
# -------------------------------------------------------------------

manuals:                                  ## Build manuals
ifndef MANUALS_DIR
	@echo "No MANUALS_DIR defined"
else
	@echo "Building manuals in $(MANUALS_DIR)"
	@cd $(MANUALS_DIR) && $(MAKE) pdf
endif

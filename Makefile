#
# This is a project Makefile. It is assumed the directory this Makefile resides in is a
# project subdirectory.
#

PROJECT_NAME := PineCone-Management-Dashboard
PROJECT_PATH := $(abspath .)
PROJECT_BOARD := evb
export PROJECT_PATH PROJECT_BOARD
#CONFIG_TOOLPREFIX :=

-include ./proj_config.mk

NETWORK_FLAGS := -DLWIP_HTTPD_CUSTOM_FILES=1 \
	-DLWIP_HTTPD_DYNAMIC_HEADERS=1

NETWORK_FLAGS += -DLWIP_ALTCP_TLS_MBEDTLS

CFLAGS += $(NETWORK_FLAGS)
CPPFLAGS += $(NETWORK_FLAGS)
CXXFLAGS += $(NETWORK_FLAGS)

ifeq ($(origin BL60X_SDK_PATH), undefined)
BL60X_SDK_PATH_GUESS ?= $(shell pwd)
BL60X_SDK_PATH ?= $(BL60X_SDK_PATH_GUESS)/../..
$(info ****** Please SET BL60X_SDK_PATH ******)
$(info ****** Trying SDK PATH [$(BL60X_SDK_PATH)])
endif


COMPONENTS_NETWORK := sntp dns_server lwip_dhcpd lwip mbedtls-bl602
COMPONENTS_BLSYS   := bltime blfdt blmtd blota bloop loopadc looprt loopset
COMPONENTS_VFS     := romfs


INCLUDE_COMPONENTS += bl602_adc bl602_glb bl602_common
INCLUDE_COMPONENTS += freertos bl602 bl602_std bl_sys hal_drv bl_gpio hal_gpio
INCLUDE_COMPONENTS += bl602_wifidrv bl602_wifi lwip
INCLUDE_COMPONENTS += yloop vfs utils netutils blog blog_testc cli
INCLUDE_COMPONENTS += httpc lwip_dhcpd mbedtls-bl602 cjson
INCLUDE_COMPONENTS += easyflash4 etl rfparam_adapter_tmp mqtt lwip_app
INCLUDE_COMPONENTS += $(COMPONENTS_NETWORK)
INCLUDE_COMPONENTS += $(COMPONENTS_BLSYS)
INCLUDE_COMPONENTS += $(COMPONENTS_VFS)
INCLUDE_COMPONENTS += $(PROJECT_NAME)
INCLUDE_COMPONENTS += $(PROJECT_NAME)/components
INCLUDE_COMPONENTS += $(PROJECT_NAME)/extensions
INCLUDE_COMPONENTS += $(PROJECT_NAME)/views
INCLUDE_COMPONENTS += $(PROJECT_NAME)/networking
INCLUDE_COMPONENTS += $(PROJECT_NAME)/data


#Only for me necessary because I use another directory: (Timkroe21)
#ALTERNATIVE_PROJECT_DIR = /home/tim-kroeckel/Dokumente/Iot_Project/PineCone-Management-Dashboard/




include $(BL60X_SDK_PATH)/make_scripts_riscv/project.mk

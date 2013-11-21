CC=gcc
CFLAGS=-Wall -Werror -O3

xmas-daemon : xmas-daemon.c
	$(CC) $(CFLAGS) -o xmas-daemon xmas-daemon.c -lwiringPi

.PHONY : clean
clean :
	-rm xmas-daemon

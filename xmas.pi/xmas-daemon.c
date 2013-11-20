/* The Xmas Daemon is responsible for talking to the GPIO pins that
 * physically control the Christmas light relays.  It runs as root and
 * listens for commands on a named pipe. */

#include <assert.h>
#include <errno.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <syslog.h>
#include <unistd.h>

#include <sys/types.h>
#include <sys/stat.h>

#define PIPE_NAME "/tmp/xmas"

void create_pipe()
{
  int result;

  result = mknod(PIPE_NAME, S_IFIFO | 00622, 0);
  if (result != 0 && errno != EEXIST) {
    perror(PIPE_NAME);
    exit(1);
  }
}

FILE *open_pipe()
{
  FILE *pipe = fopen(PIPE_NAME, "r");
  if (pipe == NULL) {
    perror(PIPE_NAME);
    exit(1);
  }

  return pipe;
}

void command_loop(FILE *pipe)
{
  uint8_t bitfield;

  while (fread(&bitfield, 1, 1, pipe) == 1) {
    syslog(LOG_NOTICE, "Command: %d\n", bitfield);
  }

  if (ferror(pipe))
    syslog(LOG_ERR, "Error reading from command pipe: %s\n", strerror(errno));

  fclose(pipe);
}

int main()
{
  int result;
  FILE *pipe;

  create_pipe();

  openlog("xmas-daemon", 0, LOG_DAEMON);
  syslog(LOG_NOTICE, "Listening for Christmas joy\n");

  result = daemon(0, 0);
  if (result != 0) {
    perror("daemon");
    exit(1);
  }

  while (1) {
    pipe = open_pipe();
    assert(pipe != NULL);

    command_loop(pipe);
  }
}

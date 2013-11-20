/* The Xmas Daemon is responsible for talking to the GPIO pins that
 * physically control the Christmas light relays.  It runs as root and
 * listens for commands on a named pipe. */

#include <assert.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

#include <sys/types.h>
#include <sys/stat.h>

#define PIPE_NAME "/tmp/xmas"

void create_pipe()
{
  int result;

  result = mknod(PIPE_NAME, S_IFIFO | 00622, 0);
  if (result != 0) {
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
    printf("Command: %d\n", bitfield);
  }

  if (ferror(pipe))
    fprintf(stderr, "Error reading from command pipe\n");

  fclose(pipe);
}

int main()
{
  FILE *pipe;

  create_pipe();

  while (1) {
    pipe = open_pipe();
    assert(pipe != NULL);

    command_loop(pipe);
  }

}

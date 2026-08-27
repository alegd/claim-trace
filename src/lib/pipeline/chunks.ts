export interface Chunk {
  id: string;
  speaker: string;
  text: string;
  start: number;
  end: number;
}

const SPEAKER_TURN = /^([A-Z]+):[ \t]*/gm;

export function chunkTranscript(transcript: string): Chunk[] {
  const turns = [...transcript.matchAll(SPEAKER_TURN)];

  return turns.map((turn, index) => {
    const start = turn.index + turn[0].length;
    const nextTurn = turns[index + 1];
    const turnEnd = nextTurn === undefined ? transcript.length : nextTurn.index;
    const text = transcript.slice(start, turnEnd).trimEnd();

    return {
      id: `k${index + 1}`,
      speaker: turn[1],
      text,
      start,
      end: start + text.length,
    };
  });
}

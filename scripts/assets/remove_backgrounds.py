#!/usr/bin/env python3
"""One CPU-only rembg/ONNX session per batch, two threads, sequential files.

Invoked by process.py via uvx, never directly with the system Python.
Retains the bria-rmbg model used by rembg 2.0.85 for the approved cutouts.
"""
import fcntl
import json
import os
from pathlib import Path
import sys

os.environ['OMP_NUM_THREADS'] = '2'


def main():
    jobs = json.loads(Path(sys.argv[1]).read_text())
    lock_path = Path(__file__).resolve().parents[2] / 'assets-src/processed/.rembg.lock'
    with lock_path.open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        import onnxruntime as ort
        from rembg import new_session, remove

        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 2
        print(f'Loading bria-rmbg once for {len(jobs)} images; CPU only, two threads.', flush=True)
        session = new_session('bria-rmbg', sess_opts=options, providers=['CPUExecutionProvider'])
        assert session.inner_session.get_providers() == ['CPUExecutionProvider']
        try:
            for job in jobs:
                source, target = Path(job['source']), Path(job['target'])
                print(f'Background removal: {source.name}', flush=True)
                output = remove(source.read_bytes(), session=session)
                temporary = target.with_suffix('.tmp')
                temporary.write_bytes(output)
                temporary.replace(target)
                Path(job['signature']).write_text(job['digest'])
        finally:
            del session


if __name__ == '__main__':
    main()

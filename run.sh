until NODE_ENV=production node index.js; do
    echo "Server 'node' crashed with exit code $?.  Respawning.." >&2
    sleep 1
done

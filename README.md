# Internet-Applications-Lab-3

## Implementation
All services are combined into a single server,
in theory each service could be implemented as a stand-alone server with custom routing,
but for convienience in deployment I have opted to make it into a single server

## setup
clone repo

```
cd Internet-Applications-Lab-3
npm install
node index.js
```

Server is now runningf

## Client
There is a client library available in ./client
There is an application implementing the library at ```./client/Application.js```

Start with ```node Application.js```

Binds a webserver to port 8432,
goto ```localhost:8432```
Any text entered in the textbox will be synchronized across all connected clients using the same id (copy url as necessary)
and will be stored on the server

## Replication
Replication model is host + 1, first connected host to respond to replication request is used to store a copy

## Caching
Caching works on expression of interest: as clients request files it gets closer to the edge nodes, eventually storing a copy client side

## locking
All actions will allocate a 30 second lock for a client, it can be released sooner, but will expire after 30 seconds.

## Directory Service
Clients are not required to use unique file names, however each file is allocated a unique id, and the latest hash of the file is kept
Directory structure is flat, so paths are part of the file name.

## Event system.
The system uses the ws nodejs module for shared events, this is a websocket library for node,
while each socket uses some resources it allows for faster communication due to the not needing a full tcp handshake for each connection,
it can also be used to ensure a node is still connected.

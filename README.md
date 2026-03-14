# Management Dashboard For PineCone Devices

### How to start and configurate a PineCone

1. Run the ``` ./install-toolchain.sh ``` to install all tools needed for compilation
2. Edit the ```Pinecone-Management-Dashboard/include/Config.hpp``` file to your liking
3. Copy the ```Pinecone-Management-Dashboard/include/private_config_example.hpp``` in the same directory with the name ```private_config.hpp``` and edit its values to your liking
4. Run the ```./compile.sh``` 
5. Connect the PineCone to your PC
6. Run the ```./flash.sh``` file and follow the instructions displayed in the terminal

### How to start and edit the dashboard

1. Edit the ```Dashboard_Pi/config.py``` to your liking
2. Run the ```Dashboard_Pi/start_dashboard.sh```
3. Open the in the Terminal displayed IP to see the dashboard 

### How to start the game server

1. Set the correct ```REALTIME_BASE_URL``` in the ```game_server/app.py```  (dashboard endpoint)
2. Run the ```game_server/start_game_server.py```

### How to start the game client
1. Run the ```game_client/start_game_client.py```
2. Open The displayed IP to open and see the game
3. There, edit the IP in the top left corner to your game server‘s IP
4. Click the green Button in the top righ

% noogle
% Like google but you get back numbers
% July 8, 2019


# Introduction
Noogle is like google but you get back numbers.  It runs various search engines, culminates the data, and provides you the most common numerical results shared across various websites.  For example, if you noogled 'us flag' you'd expect to get back 50 states.  If you noogled 'snow white' you'd expect to get back 7 dwarfs.  


# Installation
Software can be installed through apt-get.  The following commands will add the ppa and install the software.  
```
sudo curl -s --compressed -o /etc/apt/sources.list.d/noogle.list 'https://raw.githubusercontent.com/luxe/luxe.github.com/master/releases/noogle/noogle.list'
sudo apt update
sudo apt install noogle

```
To uninstall you can use:  
```
sudo apt remove noogle
```



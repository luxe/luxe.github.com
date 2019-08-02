% Gcalviz
% Visualize your google calendar as a social network
% August 2, 2019


# Introduction
An organization can be represented as a social network.  The interactions between individuals occur through many different mediums.  One of these mediums is through scheduled meetings.  Google calendar can be used to configure meeting rooms as separate calendars used for scheduling.  Assuming meetings are scheduled publicly, those who have access to scheduling a room, also have access to the meta information of the meetings that takes place.  This includes all of the attendees of a meeting.  By scraping google calendar we can construct a graph of iterations between participants of meetings.  Doing so may gleam insight into the inter-workings of an organization's social structure.  


# Installation
Software can be installed through apt-get.  The following commands will add the ppa and install the software.  
```
sudo curl -s --compressed -o /etc/apt/sources.list.d/gcalviz.list 'https://raw.githubusercontent.com/luxe/luxe.github.com/master/releases/gcalviz/gcalviz.list'
sudo apt update
sudo apt install gcalviz

```
The debian file can also be installed/uninstalled directly.  To uninstall you can use:  
```
sudo apt remove gcalviz
```



# Setting up your calendar
We'll assume you have access to various calendars in which you want to turn into a social network.  You can use any number of calendars to form your network.  In order for the scraper to detect these calendars however, you have to explicitly add yourself as a subscriber.  This can be done by using the "other calendars" panel found on the left side of the google calendar app and selecting various calendars to subscribe to.  The calendars do not have to remain visible for the analysis.  They only need to be listed in your "other calendars" side panel.  


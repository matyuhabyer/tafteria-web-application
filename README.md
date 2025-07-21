//Steps

Connect MongoDB using MongoDB Compass

Create a new database called "tafteria" and a collection name called users
Import the included .json files with "tafteria" prefix and the according collection name.
For example, establishments. import tafteria.establishments.json to establishment collection.
Add new collections as necessary.


Open terminal in current directory:

install these first:
const express = require('express');
const app = express();
const path = require('path');
const handlebars = require('express-handlebars');
const mongoose = require('mongoose');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');


npm init -y

node app.js

Go to web browser and type: localhost:3000/

Enjoy!
/** @license
 *  Copyright 2016 - present The Midicast Authors. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not
 *  use this file except in compliance with the License. You may obtain a copy
 *  of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  License for the specific language governing permissions and limitations
 *  under the License.
 */

const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');

const rimraf = require('rimraf')
const _ = require('lodash');

const SRC_PATH = './src/';
const DIST_PATH = './dist/';

const developmentManifest = require(SRC_PATH + 'manifest.json');
const productionManifest = Object.assign({}, developmentManifest);

// The Content Security Policy is used for Hot Module Replacement with the dev
// server, but unneeded in production.
delete productionManifest['content_security_policy'];
productionManifest.permissions = _.without(developmentManifest.permissions, 'http://localhost/');

rimraf.sync(DIST_PATH);
fs.mkdir(DIST_PATH);

fs.writeFileSync(
  DIST_PATH + 'manifest.json',
  JSON.stringify(productionManifest)
);

copyFolder('icons');
copyFolder('pages');
copyFolder('third_party');

// I'm not sure if it's better to use childProcess or just require to start
// pundle:
//
//    require('../../node_modules/.bin/pundle')
//
console.log(
  childProcess.execSync(
    '../../node_modules/.bin/pundle',
    {
      cwd: process.cwd()
    }
  ).toString()
);

function copyFolder(folderName) {
  if (!folderName.endsWith('/')) {
    folderName = folderName + '/';
  }

  fs.mkdir(DIST_PATH + folderName);

  fs.readdirSync(SRC_PATH + folderName).forEach(
    fileName => {
      try {
        let file = fs.readFileSync(SRC_PATH + folderName + fileName);
        let fileAsString = file.toString();

        if (fileAsString.includes('localhost')) {
          file = fileAsString.replace('http://localhost:8080/', '/');
        }

        fs.writeFileSync(
          DIST_PATH + folderName + fileName,
          file
        );
      } catch (error) {
        if (error.message.includes('ISDIR')) {
          copyFolder(folderName + fileName);
        }
      }
    }
  );
}

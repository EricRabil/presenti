#!/usr/bin/env node
/********************************************************************************
 * Copyright (c) 2018 TypeFox and others
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
// @ts-check

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const strip_json_comments = require('strip-json-comments');

const config = JSON.parse(strip_json_comments(fs.readFileSync('tsconfig.json').toString()));
config.files = [];
config.references = [];
const workspaces = JSON.parse(JSON.parse(child_process.execSync('yarn workspaces --json info').toString()).data);
for (const name in workspaces) {
    const workspace = workspaces[name];
    const location = path.resolve(process.cwd(), workspace.location);
    const tsconfigPath = path.resolve(location, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
        config.references.push({
            path: workspace.location
        });
        const workspaceConfig = JSON.parse(strip_json_comments(fs.readFileSync(tsconfigPath).toString()));
        workspaceConfig.compilerOptions.composite = true;
        workspaceConfig.references = [];
        for (const dependency of workspace.workspaceDependencies) {
            const dependecyLocation = path.resolve(process.cwd(), workspaces[dependency].location);
            if (fs.existsSync(path.resolve(dependecyLocation, 'tsconfig.json'))) {
                workspaceConfig.references.push({
                    path: path.relative(location, dependecyLocation)
                });
            }
        }
        if (!name.includes("server")) fs.writeFileSync(tsconfigPath, JSON.stringify(workspaceConfig, undefined, 2));
    }
}
fs.writeFileSync('tsconfig.json', JSON.stringify(config, undefined, 2));
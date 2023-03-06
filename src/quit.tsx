import { ActionPanel, Action, List, showHUD, Detail, Alert, confirmAlert, showToast } from "@raycast/api";
import { execSync } from "child_process";
import { runAppleScript,runAppleScriptSync } from "run-applescript";

function getAppPaths() {
    return execSync(`lsappinfo list | grep -B 4 'Foreground' | grep 'bundle path' | grep -o '".*"' | tr -d '"'`);
}

async function quitApp(appPath:string,appNames:Map<string,string>) {
    var appName:string =  (appPath=="")?"":appNames.get(appPath)!;
    var HUDmsg = (appName=="")?`🎉 Quit All Applications`:(appName=="Finder")?`🎉 Closed all ${appName} Windows`:`🎉 Quit ${appName}`;
    var quitScript:string;
    if(appPath=="") {
        var tempString:string = `{`;
        for(let [key, value] of appNames.entries()) {
            if(value=="Finder") {
                appNames.delete(key)}
            else {
                tempString = `${tempString}"${value}",`}
        }          
        quitScript = `  
                        tell application "Finder" to close windows
                        repeat with appName in ${tempString.replace(/.$/,"}")}
                            try
                                tell application appName to quit
                            end try    
                        end repeat
                    `;            
        const options: Alert.Options = {
            title: "Are you sure you want to quit all apps?",
            primaryAction: {
                title: "Quit All",
                style: Alert.ActionStyle.Destructive,
                onAction: async () => {
                    await showToast({ title: "Hang tight! Quitting all apps"});
                    await runAppleScript(quitScript).then(() => {
                        showHUD(HUDmsg);
                        });
                }
            },
            dismissAction: {
                title: "Cancel",
                style: Alert.ActionStyle.Cancel,
                onAction: () => {
                }
            }
            };
        await confirmAlert(options);
    }
    else { 
            //var quitORCloseWindows:string=(appName=="Finder")?"close windows":"quit";
            quitScript = `
                            try
                                tell application "${appName}" to ${(appName=="Finder")?"close windows":"quit"}
                            end try 
                            `;
            await runAppleScript(quitScript).then(() => {
                showHUD(HUDmsg);
            });
    }
}

function getAppName(str:string) {
    return str.substring(str.lastIndexOf("/") + 1, str.lastIndexOf("."));
}

function getAppNames(appPaths:string[]) {
    var appPath:string;
    const appNames:Map<string,string> = new Map();
    const finderWindowCount:number = parseInt(runAppleScriptSync(`tell application "Finder" to count of every window`))
    for(var i=0;i<appPaths.length;i++) {
        appPath = appPaths[i];
        if(appPath.includes("Raycast.app") || (appPath.includes("Finder.app") && finderWindowCount==0)) {
            appPaths.splice(i,1);
            i--;
        }
        else { 
            appNames.set(appPath,getAppName(appPath));
        }
    }
    return appNames;
}

export default function Command() {
    console.log("Start");
    const appPaths:string[] = getAppPaths().toString().trim().split("\n"); 
    console.log(appPaths);
    const appNames:Map<string,string> = getAppNames(appPaths);
    console.log(appNames);
    if(appPaths.length==0)
    {
        return(
            <Detail markdown={"No Application is Running"} />
        );
    }
    else 
    {
        return(
            <List>
                <List.Item title="Quit All Applications" 
                    icon={{ fileIcon: "/Applications"}} 
                    actions={
                        <ActionPanel>
                            <Action title="Quit All" onAction={() => quitApp("",appNames)} />
                        </ActionPanel> }
                />
                {appPaths.map(appPath => (
                    <List.Item key={appPath} title={appNames.get(appPath)!} 
                    icon={{ fileIcon: appPath}} 
                    actions={
                        <ActionPanel>
                            {appPath.includes("Finder.app") 
                                ? <Action title={`Close all ${appNames.get(appPath)} Windows`} onAction={() => quitApp(appPath,appNames)} />
                                : <Action title={`Quit ${appNames.get(appPath)}`} onAction={() => quitApp(appPath,appNames)} />
                            }
                        </ActionPanel> }
                    />
                ))} 
            </List>
        );
    }
}
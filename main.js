var defaultCode = "<setup action>\n" +
    "  clear battle log\n" +
    "  display action\n" +
    "  immortal: targets, true\n" +
    "  perform start\n" +
    "  wait for movement\n" +
    "  cast animation\n" +
    "  wait for animation\n" +
    "</setup action>\n" +
    "\n" +
    "<whole action>\n" +
    "  perform action\n" +
    "  motion wait: user\n" +
    "  action animation\n" +
    "  wait for animation\n" +
    "  action effect\n" +
    "  death break\n" +
    "</whole action>\n" +
    "\n" +
    "<target action>\n" +
    "  perform action\n" +
    "  motion wait: user\n" +
    "  action animation\n" +
    "  wait for animation\n" +
    "  action effect\n" +
    "  death break\n" +
    "</target action>\n" +
    "\n" +
    "<follow action>\n" +
    "\n" +
    "</follow action>\n" +
    "\n" +
    "<finish action>\n" +
    "  immortal: targets, false\n" +
    "  wait for new line\n" +
    "  clear battle log\n" +
    "  perform finish\n" +
    "  wait for movement\n" +
    "  wait for effect\n" +
    "  action common event\n" +
    "</finish action>\n";

var currentProject = "";
var dirty = false;

var editor = CodeMirror(document.getElementById("codeMirrorHolder"), {
    value: defaultCode,
    mode: "simplemode",
    lineNumbers: true,
    tabSize: 2,
    highlightSelectionMatches: true,
    scrollbarStyle: "simple",
    styleActiveLine: true,
    theme: "serge-light",
    autoCloseBrackets: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    foldGutter: {
        rangeFinder: new CodeMirror.fold.combine(CodeMirror.fold.brace, CodeMirror.fold.xml, CodeMirror.fold.indent)
    },
    extraKeys: {
        "F11": function(cm) {
            cm.setOption("fullScreen", !cm.getOption("fullScreen"));
        },
        "Esc": function(cm) {
            if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
        }
    }

});


function toggleFullscreen()
{
    editor.setOption("fullScreen", !editor.getOption("fullScreen"));
}

function changeTheme()
{
    var theme = document.getElementById("themeSelector").value;

    editor.setOption("theme", theme);

    if (currentUser.signInStatus)
    {
        firebase.database().ref(currentUser.uid).update({
            theme: theme,
        });
    }
}

editor.on("inputRead", function(event){
    setDirty(true);
    editor.showHint({
        hint: CodeMirror.hint.anyword,
        completeSingle: false,
    });
});

function saveHandler()
{

    if (currentProject == "")
    {
        saveAsHandler();
    }
    else
    {
        firebase.database().ref(currentUser.uid + "/sequences/" + currentProject).update({
            code: editor.getValue(),
        });
        setDirty(false);
    }
}

function saveAsHandler()
{
    var result = prompt("Give this sequence a name.");

    if (result != null)
    {

        currentProject = firebase.database().ref(currentUser.uid + "/sequences").push({
            name: result,
            code: editor.getValue(),
        });
        setCurrentProject(currentProject.key);
        setDirty(false);

    }
}

function loadHandler()
{
    var key = document.getElementById("sequenceSelector").value;
    var confirmation = true;
    if (dirty)
    {
        confirmation = confirm("Unsaved changes will be lost, continue?");
    }

    if (confirmation)
    {
        firebase.database().ref(currentUser.uid).child("sequences").child(key).once('value', function(sequence){
            editor.setValue(sequence.val().code);
            setCurrentProject(key);
        });
    }
}

function newHandler()
{
    var confirmation = true;
    if (dirty)
    {
        confirmation = confirm("Unsaved changes will be lost, continue?");
    }

    if(confirmation)
    {
        editor.setValue(defaultCode);
        setCurrentProject("");
        setDirty(false);
    }
}

function deleteHandler()
{
    var selector = document.getElementById("sequenceSelector")

    var key = selector.value;
    var name = selector.options[selector.options.selectedIndex].innerHTML;
    var confirmation = confirm("Are you sure you want to delete: " + name + "?");

    if (confirmation)
    {
        firebase.database().ref(currentUser.uid + "/sequences").child(key).remove();

        if (currentProject == key)
        {
            editor.setValue(defaultCode);
            setCurrentProject("");
            setDirty(false);
        }
    }
}

function signInButton()
{
    document.getElementById("firebaseui-auth-container").removeAttribute("style");
}

function signOutButton()
{
    firebase.auth().signOut();
}

function signedOutHandler()
{
    document.getElementById("signedInButtons").style.display = "none";
    document.getElementById("signOutButton").style.display = "none";
    document.getElementById("signInButton").removeAttribute("style");
    document.getElementById("userName").innerHTML = "";
}
function signedInHandler()
{
    firebase.database().ref(currentUser.uid).child("theme").once('value', function(theme){
        document.getElementById("themeSelector").value = theme.val();
        changeTheme();
    });

    firebase.database().ref(currentUser.uid).child("sequences").on('value', function(sequences){
        var htmlString = "";
        sequences.forEach(function(sequence){
            htmlString += "<option value='" + sequence.key + "'>" + sequence.val().name + "</option>";
        });
        document.getElementById("sequenceSelector").innerHTML = htmlString;
    });

    document.getElementById("signedInButtons").removeAttribute("style");
    document.getElementById("signInButton").style.display = "none";
    document.getElementById("signOutButton").removeAttribute("style");
    document.getElementById("userName").innerHTML = "Signed In As: " + currentUser.displayName;
}

function setDirty(torf)
{
    if (currentUser.uid != "")
    {
        var projectName = document.getElementById("projectName");

        if (torf && !dirty)
        {
            projectName.innerHTML += "(Unsaved)";
        }
        else if(!torf)
        {
            projectName.innerHTML = projectName.innerHTML.split("(Unsaved)")[0];
        }
    }
    dirty = torf;
}

function setCurrentProject(curProj)
{
    var projectName = document.getElementById("projectName");
    currentProject = curProj;
    if (curProj == "")
    {
        projectName.innerHTML = "New Sequence";
    }
    else
    {
        firebase.database().ref(currentUser.uid + "/sequences/" + curProj).once("value", function(project){
            projectName.innerHTML = "Current Sequence: " + project.val().name;   
        });

    }
}

function shareHandler()
{
    var publicName = prompt("Give the sequence a name. (Optional)");
    var publicKey = "";
    var publicURL = "";

    if (publicName != null)
    {
        publicKey = firebase.database().ref("public/").push({
            name: publicName,
            code: editor.getValue(),
        });
        publicURL = window.location.origin + "/share.html?sequence=" + publicKey.key;

        document.getElementById("shareContent").innerHTML = "<h1>Your sequence is ready to share at: </h1><a target='_blank' href='" + publicURL + "'><h1>" + publicURL + "</h1></a>";
        document.getElementById("shareModal").removeAttribute("style");
    }

}

var firstClick = true;

function previewHandler()
{
    if (firstClick)
    {
        document.getElementById("previewHolder").removeAttribute("style");
        document.getElementById("ghostpane").removeAttribute("style");
        SceneManager.run(Scene_Boot);
        firstClick = false;
    }
    else
    {
        document.getElementById("previewHolder").removeAttribute("style");
        document.getElementById("ghostpane").removeAttribute("style");
        SceneManager.goto(Scene_Map);
    }

    window.scrollTo(0, document.getElementById("previewHolder").offsetTop - 50);
}

function closePreview()
{
    setTimeout(function(){
        SceneManager.goto(Scene_Pause);
        document.getElementById("previewHolder").style.display = "none";
        document.getElementById("ghostpane").style.display = "none";
    }, 1000);
}
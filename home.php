<?php

session_start();

require 'database.php';






?>
    <!DOCTYPE html>
    <html>

    <head>
        <link href='https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,400italic' rel='stylesheet' type='text/css'>
        <link href='https://fonts.googleapis.com/css?family=Lato:400,300italic' rel='stylesheet' type='text/css'>
        <link href="http://s3.amazonaws.com/codecademy-content/courses/ltp/css/shift.css" rel="stylesheet">
        <link rel="stylesheet" href="http://s3.amazonaws.com/codecademy-content/courses/ltp/css/bootstrap.css">
        <link rel="stylesheet" href="home_css.css">
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
        <!-- Important Owl stylesheet -->
        <link rel="stylesheet" href="owl-carousel/owl.carousel.css">
        <!-- Default Theme -->
        <link rel="stylesheet" href="owl-carousel/owl.theme.css">
        <!--  jQuery 1.7+  -->
        <script src="jquery-1.9.1.min.js"></script>
        <!-- Include js plugin -->
        <script src="http://code.jquery.com/jquery-latest.min.js"></script>
        <script src="http://code.jquery.com/jquery-latest.min.js"></script>
    </head>

    <body>
        <div class="nav">
            <div class="container">
                <ul class="pull-left" />
                <liQ><img src="Resources/logo2.png" width="30" height="30"></liQ>
                <li><a href="https://catlife.ucmerced.edu/organization/q/about">Q project</a></li>
                <li><a href="Pages/about.html">About</a></li>
                </ul>
                <ul class="pull-right" />
                <li>
                    <?= $_SESSION['first_name']; ?>
                </li>
                <li><a href="Pages/upload.html">Upload</a></li>
                <li><a href="#">Contact</a></li>
                <li><a href="#">Supporters</a></li>
                <li><a href="#">Help</a></li>
                </ul>
            </div>
        </div>
        <a name="top">
            <div class="jumbotron" align="center">
                <div class="container"> </div>
                <div class="userPanel" align="center">
                    <div class="userBox" align="center"> <img class=userImg src="Resources/userIcon.png" width="50" height="50">
                        <div class="name" align="center">
                            <?= $_SESSION['full_name']; ?>
                        </div>
                    </div>
                    <div class="iconSidebar" align="center"> <img class="sbIcons" src="Resources/userOutline.png" width="20" height="20"> </div>
                    <div class="sidebar" align="center">
                        <p>User Profile</p>
                        <p>Workflows</p>
                        <p>Files</p>
                        <p id="uploadFiles">Upload Files</p>
                        <p>Tools</p>
                        <p>Plugins</p>
                    </div>
                    <form action="logout.php">
                        <button type="submit">Logout</button>
                    </form>
                </div>
                <div id="uploadCard" align="center">
                    <div id="titleBar">Upload Files</div>
                </div>
                <script>
                    $(document).ready(function () {
                        $("#uploadFiles").click(function () {
                            $("#uploadCard").toggle(0);
                        });
                    });
                </script>
            </div>
    </body>

    </html>
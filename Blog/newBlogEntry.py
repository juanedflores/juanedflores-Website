#!/usr/bin/python
# -*- coding: utf-8 -*-

# A script that I execute if I ever want to create a new blog entry.
# Steps:
#    1.) Asks me for the title of entry:
#       - creates new directory and directory.md file with template.
#   2.) Adds the html code for this new entry.

import os
import re
import json
import sys
import random
from datetime import date

# get todays date
today = date.today()
formatted_date = today.strftime("%B %d, %Y")
last_modified = str(today)
last_modified_formatted = str(formatted_date)

# init values
blogEntryTitle = ""
blogEntryDescription = ""
blogEntryTags = ""
tags = []
inputTitle = ""
added_new_tag = False


def main():
    global last_modified, blogEntryTitle, blogEntryDescription, blogEntryTags, tags, inputTitle, added_new_tag, last_modified_formatted

    # NOTE: The main function checks if there are any arguments or not to determine whether we are updating the entry post html file, or creating a new entry and updating.

    # If an argument was passed, we are updating, else we are creating
    if (len(sys.argv) > 1):
        # If arguments is more than 1, we are creating
        inputTitle = str(sys.argv[1])
        print("WE ARE UPDATING \n\n")
        print("Input Title: ")
        print(inputTitle)
        updateEntry()
        sys.exit(0)

    else:
        # gets the title
        blogEntryTitle = input("Enter new blog entry title: ")
        # gets the blog entry description
        blogEntryDescription = input(
            "Enter a short description for {}: ".format(blogEntryTitle))
        # gets the tags
        blogEntryTags = input("Enter any tags followed by comma: ")
        # make an array of tags
        tags = blogEntryTags.split(",")
        #  create the necessary directories
        os.mkdir(blogEntryTitle.replace(" ", "_"))
        os.mkdir(blogEntryTitle.replace(" ", "_") + "/cover")
        # create the new markdown file
        f = open("{}/{}.md".format(blogEntryTitle.replace(" ", "_"),
                                   blogEntryTitle.replace(" ", "_")), "w+")
        # write the header
        f.write(
            "---\ntitle: {}\ndate_created: {}\n---\n\n".format(blogEntryTitle, last_modified_formatted))
        #
        addEntrytoHTML()

        if (added_new_tag):
            with open('tags.json', 'r') as tags_file:
                json_data = json.load(tags_file)

            tags_html = ""

            for tag in json_data:
                tagClassifier = tag.strip().replace(" ", "_")
                tagName = tag
                tagColor = str(json_data[tag])
                list_element = "<li uk-filter-control='.tag-{}'><a href='#'>\n<span class='uk-label' style='background-color: {}; color: white'>{}</span>\n</a>\n</li>\n".format(
                    tagClassifier, tagColor, tagName)
                tags_html += list_element + "\n"

            htmlFile = open("../blog.html", "r+")
            htmlFilestr = htmlFile.read()

            septop = '<!-- START TAGS -->'
            sepbottom = '<!-- END TAGS -->'
            top = htmlFilestr.split(septop, 1)[0]
            bottom = htmlFilestr.split(sepbottom, 1)[1]

            newhtml = top + septop + tags_html + sepbottom + bottom

            htmlFile.seek(0)
            htmlFile.write(newhtml)
            htmlFile.truncate()
            htmlFile.close()


def updateEntry():
    global blogEntryTitle, blogEntryDescription, blogEntryTags, last_modified, tags, today

    # opens the html file
    htmlFile = open("../blog.html", "r").read()
    # finds the blog entries section
    entries_raw = re.findall(
        '<!-- BLOG ENTRIES -->(.*?)<!-- BLOG ENTRIES END -->', htmlFile, re.DOTALL)
    #  splits the blog entries section into individual entries
    # drop the wrapper <ul> written by the previous run so it doesn't nest
    entries_section = re.sub("<ul class='js-filter[^>]*>", "", entries_raw[0])
    lineiterator = iter(entries_section.splitlines())
    entries = []
    cur_entry = ""
    found_entry = False
    modifying_date = False
    index = 0
    target_index = 0
    for l in lineiterator:
        if (found_entry):
            print("FOUDN THE ENTRY")
            # change the modified date
            if (modifying_date):
                if (re.match('.*\d{4}-\d{2}-\d{2}.*', l)):
                    print("CHANGING ENTRY MODIFIED DATE")
                    l = re.sub("\d{4}-\d{2}-\d{2}", str(today), l)

            # appends the entry
            if (re.match('\w*', l)):
                cur_entry += str(l)

            if (l == ""):
                print("ADDING TO LIST..")
                index += 1
                cur_entry += "\n"
                entries.append(cur_entry)
                print("\n")
                print("ENTRIES: \n\n")
                print(entries)
                if (modifying_date):
                    target_index = index
                    print("target_index: " + str(target_index))
                cur_entry = ""
                found_entry = False
                modifying_date = False

        if (re.search('<!--', l)):
            print("LOOK AT ME: " + l)
            #  take into account regex special characters
            inputTitlestr = inputTitle
            inputTitlestr = inputTitlestr.replace('+', '\+')
            print('inputTitlestr: ' + inputTitlestr)
            if (re.match('.*<!-- {} -->'.format(inputTitlestr.replace('_', ' ')), l)):
                print("MODIFYING TIME...")
                modifying_date = True
                # sys.exit(0)

            cur_entry += str(l)
            found_entry = True

    sep = '<!-- BLOG ENTRIES -->'
    header = htmlFile.split(sep, 1)[
        0] + sep + "<ul class='js-filter uk-list uk-width-2-3@l uk-align-center'>"

    stripped = ""
    updated_entry = ""
    entry_index = 0
    for entry in entries:
        entry_index += 1
        if (entry_index == target_index):
            updated_entry = entry + "\n"
            print("found entry...")
            continue
        stripped += entry + "\n"

    # stripped += "\n\n<!-- BLOG ENTRIES END --></ul><script id='dsq-count-scr' src='//juanedflores-blog.disqus.com/count.js' async></script>"
    stripped += "\n\n<!-- BLOG ENTRIES END --></ul><script id='dsq-count-scr' src='//juanedflores-blog.disqus.com/count.js' async></script></div></div></body></html>"
    htmlcode = header + updated_entry + stripped

    f = open("../blog.html", "w")
    f.write(htmlcode)
    f.close()

    # run prettier on file.
    os.system("npx prettier --write ../blog.html")


def addEntrytoHTML():
    global blogEntryTitle, blogEntryDescription, blogEntryTags, last_modified, tags

    #  copy the blog.html file
    os.system("cp ../blog.html ../blog_copy.html")
    # reads the blog.html file
    htmlFile = open("../blog.html", "r").read()
    # finds the blog entries section
    entries_raw = re.findall(
        '<!-- BLOG ENTRIES -->(.*?)<!-- BLOG ENTRIES END -->', htmlFile, re.DOTALL)
    # drop the wrapper <ul> written by the previous run so it doesn't nest
    entries_section = re.sub("<ul class='js-filter[^>]*>", "", entries_raw[0])
    # splits the blog entries section into lines
    lineiterator = iter(entries_section.splitlines())
    # instantiates an array that holds each entry
    entries = []
    # instantiates a string that holds the new entry
    template = "\n\n<!-- {} -->\n".format(blogEntryTitle)
    # cleans any possible unwanted text in tags
    tagfilter = ""
    for tag in tags:
        # remove any leading and trailing whitespace characters
        tag = tag.strip()
        # replace spaces with underscores
        tag = tag.replace(" ", "_")
        # prepend the tag with text to follow convention
        tagfilter += "tag-" + tag + " "

    print("adding tags: " + tagfilter)

    # create the html block
    template += "<li class='{}'>".format(tagfilter)
    template += "<div class='entry'>"
    template += "<div class='uk-card uk-card-default uk-grid-collapse uk-transition-toggle uk-child-width-1-2@s uk-margin' "
    template += "onclick=" + "\"location.href='./Blog/{}/{}.html'\"".format(
        blogEntryTitle.replace(" ", "_"), blogEntryTitle.replace(" ", "_"))
    template += "style='border: 1px solid #000000; border-radius: 3px' uk-grid>"
    template += "<div class='uk-flex-last@s uk-card-media-right uk-transition-opaque uk-transition-scale-up uk-cover-container'>"
    template += "<img class='uk-cover' style='width: 100%; height: 100%; object-fit: cover' "
    template += "src='./Blog/{}/cover/cover.png' ".format(
        blogEntryTitle.replace(" ", "_"), blogEntryTitle.replace(" ", "_"))
    template += "alt='' />"
    template += "<canvas width='600' height='400'></canvas></div>"
    template += "<div><div class='uk-card-body'>"
    template += "<h3 class='uk-card-title'>{}</h3>".format(blogEntryTitle)
    template += "<span>last modified: {}</span>".format(last_modified)
    template += "<p style='color: black'>{}</p>".format(blogEntryDescription)
    #  add tags
    template = addTags(template)
    template += "<br /><br />"
    template += "<a href='https://juanedflores.com/Blog/{}/{}.html#disqus_thread'>Link</a>".format(
        blogEntryTitle.replace(" ", "_"), blogEntryTitle.replace(" ", "_"))
    template += "</div></div></div></div></li>\n\n"

    # adds this new html block to the end of the blog entries section
    entries.append(template)

    cur_entry = ""
    found_entry = False
    for l in lineiterator:
        if (found_entry):
            if (re.match('\w*', l)):
                cur_entry += str(l)

            if (l == ""):
                cur_entry += "\n"
                entries.append(cur_entry)
                cur_entry = ""
                found_entry = False

        if (re.search('<!--', l)):
            cur_entry += str(l)
            found_entry = True

    sep = '<!-- BLOG ENTRIES -->'
    stripped = htmlFile.split(sep, 1)[
        0] + sep + "<ul class='js-filter uk-list uk-width-2-3@l uk-align-center'>"

    for entry in entries:
        stripped += entry + "\n"

    # stripped += "<!-- BLOG ENTRIES END -->"
    # stripped += "</ul><script id='dsq-count-scr' src='//juanedflores-blog.disqus.com/count.js' async></script></div></div></body></html>"

    stripped += "\n\n<!-- BLOG ENTRIES END --></ul><script id='dsq-count-scr' src='//juanedflores-blog.disqus.com/count.js' async></script></div></div></body></html>"

    # print(stripped)
    f = open("../blog.html", "w")
    f.write(stripped)
    f.close()

    # run prettier on file.
    os.system("npx prettier --write ../blog.html")
    os.system("npx prettier --write ./tags.json")
    os.system("make")


def addTags(template):
    global added_new_tag

    # checks if there are tags to add
    if (len(tags) > 0):
        # opens the tags.json file to read
        json_file = open("tags.json", "r")
        data = json_file.read()
        #  hold all the objects in file
        objs = json.loads(data)
        json_file.close()

        newtag = ""
        # iterate through all the tags
        for tag in tags:
            # clean the tag from any leading or trailing whitespace
            tag = tag.strip()

            # instantiate a tag_color variable
            tag_color = "#FFFFFF"

            keyfound = False
            for key in objs:
                # check if tag already exists
                if (key.upper() == tag.upper()):
                    keyfound = True
                    tag_color = objs[key]
                    # create the tag spam html code
                    newtag = "<span class='uk-label' style='background-color: {}'>{}</span>\n".format(
                        tag_color, tag)

            #  if tag doesn't exist, add it to the json file
            if (not keyfound):
                # give it a random hex color
                random_number = random.randint(0, 16777215)
                hex_number = format(random_number, 'x')
                hex_number = '#'+hex_number

                # write the new tag to the json file
                objs[tag] = hex_number
                tag_color = objs[tag]
                json_file = open("tags.json", "w+")
                json_obj = json.dumps(objs, indent=2)
                json_file.write(str(json_obj))
                # create the tag spam html code
                newtag = "<span class='uk-label' style='background-color: {}'>{}</span>\n".format(
                    tag_color, tag)

            template += newtag
            json_file.close()
            added_new_tag = True

    return template


main()

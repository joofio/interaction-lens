let pvData = pv;
let htmlData = html;

let epiData = epi;
let ipsData = ips;

let getSpecification = () => {
    return "1.0.0";
};

let enhance = async () => {
    // Proves that IPS exists
    if (ips == "" || ips == null) {
        throw new Error("Failed to load IPS: the LEE is getting a empty IPS");
    }

    // Instantiates the array of condition codes
    let arrayOfIngredientCodes = [];

    // Iterates through the IPS entry searching for conditions
    ips.entry.forEach((element) => {
        if (element.resource.resourceType == "Medication") {
            if (element.resource.ingredient != undefined) {
                element.resource.ingredient.forEach((ingredient) => {
                    if (ingredient.itemCodeableConcept != undefined) {
                        ingredient.itemCodeableConcept.coding.forEach((coding) => {
                            console.log("Ingredient: " + coding.code + " - " + coding.system)
                            arrayOfIngredientCodes.push({
                                code: coding.code,
                                system: "",
                            });
                        });
                    }
                })
            }
        }
    });

    // If there are no conditions, return the ePI as it is
    if (arrayOfIngredientCodes.length == 0) {
        return htmlData;
    }

    // ePI traslation from terminology codes to their human redable translations in the sections
    let compositions = 0;
    let categories = [];
    epi.entry.forEach((entry) => {
        if (entry.resource.resourceType == "Composition") {
            compositions++;
            //Iterated through the Condition element searching for conditions
            entry.resource.extension.forEach((element) => {
                
                // Check if the position of the extension[1] is correct
                if (element.extension[1].url == "concept") {
                    // Search through the different terminologies that may be avaible to check in the condition
                    if (element.extension[1].valueCodeableReference.concept != undefined) {
                        element.extension[1].valueCodeableReference.concept.coding.forEach(
                            (coding) => {
                                console.log("Extension: " + element.extension[0].valueString + ":" + coding.code + " - " + coding.system)
                                // Check if the code is in the list of categories to search
                                if (equals(arrayOfIngredientCodes, { code: coding.code, system: "" })) {
                                    // Check if the category is already in the list of categories
                                    categories.push(element.extension[0].valueString);
                                }
                            }
                        );
                    }
                }
            });
        }
    });

    if (compositions == 0) {
        throw new Error('Bad ePI: no category "Composition" found');
    }

    if (categories.length == 0) {
        return htmlData;
    }
    
    //Focus (adds highlight class) the html applying every category found
    return await annotateHTMLsection(categories, "highlight");
};

let annotationProcess = (listOfCategories, enhanceTag, document, response) => {
    listOfCategories.forEach((check) => {
        if (response.includes(check)) {
            let elements = document.getElementsByClassName(check);
            for (let i = 0; i < elements.length; i++) {
                elements[i].classList.add(enhanceTag);
            }
            if (document.getElementsByTagName("head").length > 0) {
                document.getElementsByTagName("head")[0].remove();
            }
            if (document.getElementsByTagName("body").length > 0) {
                response = document.getElementsByTagName("body")[0].innerHTML;
                console.log("Response: " + response);
            } else {
                console.log("Response: " + document.documentElement.innerHTML);
                response = document.documentElement.innerHTML;
            }
        }
    });

    if (response == null || response == "") {
        throw new Error(
            "Annotation proccess failed: Returned empty or null response"
        );
        //return htmlData
    } else {
        console.log("Response: " + response);
        return response;
    }
}

let annotateHTMLsection = async (listOfCategories, enhanceTag) => {
    let response = htmlData;
    let document;

    if (typeof window === "undefined") {
        let jsdom = await import("jsdom");
        let { JSDOM } = jsdom;
        let dom = new JSDOM(htmlData);
        document = dom.window.document;
        return annotationProcess(listOfCategories, enhanceTag, document, response);
    } else {
        document = window.document;
        return annotationProcess(listOfCategories, enhanceTag, document, response);
    }
};

let equals = (array, object) => {
    return array.some((element) => {
        return (element.code === object.code) && (element.system === object.system);
    });
}

return {
    enhance: enhance,
    getSpecification: getSpecification,
};

#include <iostream>
using namespace std;

int main() {

    // Movie list
    string movies[15] = {
        "The Matrix",
        "Dune",
        "The Adam Project",
        "Insidious",
        "The Nun",
        "A Quiet Place",
        "John Wick",
        "Mission Impossible",
        "The Gray Man",
        "Me Before You",
        "La La Land",
        "Love, Rosie",
        "Knives Out",
        "Sherlock Holmes",
        "Murder Mystery"
    };

    // Genres indicator for each movie
    string genres[15] = {
        "Sci-Fi",
        "Sci-Fi",
        "Sci-Fi",
        "Horror",
        "Horror",
        "Horror",
        "Action",
        "Action",
        "Action",
        "Romance",
        "Romance",
        "Romance",
        "Mystery",
        "Mystery",
        "Mystery"
    };

    // Recommendation movies
    string sciFiMovies[3] = {
        "The Matrix",
        "Dune",
        "The Adam Project"
    };

    string horrorMovies[3] = {
        "Insidious",
        "The Nun",
        "A Quiet Place"
    };

    string actionMovies[3] = {
        "John Wick",
        "Mission Impossible",
        "The Gray Man"
    };

    string romanceMovies[3] = {
        "Me Before You",
        "La La Land",
        "Love, Rosie"
    };

    string mysteryMovies[3] = {
        "Knives Out",
        "Sherlock Holmes",
        "Murder Mystery"
    };

    // Genre counters
    int sciFiCount = 0;
    int horrorCount = 0;
    int actionCount = 0;
    int romanceCount = 0;
    int mysteryCount = 0;

    int choice;
    int numberOfChoices;

    // Keep track of selected movies
    bool selected[15] = {false};

    // Header
    cout << "=====================================\n";
    cout << "       NETFLIX MOVIE RECOMMENDER\n";
    cout << "=====================================\n\n";

    // Display movie list
    cout << "Movie List:\n";

    for (int i = 0; i < 15; i++) {
        cout << i + 1 << ". " << movies[i]
        << endl;
    }

    // Ask number of movie choices
    cout << "\nHow many movies would you like to select? (3-5): ";
    cin >> numberOfChoices;

    // Validate number of choices
    while (numberOfChoices < 3 || numberOfChoices > 5) {
        cout << "Please enter a number between 3 and 5: ";
        cin >> numberOfChoices;
    }

    // User selects movies
    cout << "\nSelect your movies:\n";

    for (int i = 0; i < numberOfChoices; i++) {

        cout << "Enter movie number " << i + 1 << ": ";
        cin >> choice;

        // Validate movie number
        while (choice < 1 || choice > 15) {
            cout << "Invalid movie number. Please enter 1-15: ";
            cin >> choice;
        }

        // Check for duplicate movie
        while (selected[choice - 1] == true) {
            cout << "You have already selected this movie.\n";
            cout << "Please choose a different movie number: ";
            cin >> choice;

            while (choice < 1 || choice > 15) {
                cout << "Invalid movie number. Please enter 1-15: ";
                cin >> choice;
            }
        }

        // Mark movie as selected
        selected[choice - 1] = true;

        // Get genre of selected movie
        string selectedGenre = genres[choice - 1];

        cout << "You selected: "
             << movies[choice - 1]
             << " (" << selectedGenre << ")" << endl;

        // Count genre
        if (selectedGenre == "Sci-Fi") {
            sciFiCount++;
        }
        else if (selectedGenre == "Horror") {
            horrorCount++;
        }
        else if (selectedGenre == "Action") {
            actionCount++;
        }
        else if (selectedGenre == "Romance") {
            romanceCount++;
        }
        else if (selectedGenre == "Mystery") {
            mysteryCount++;
        }
    }

    // Display genre counts
    cout << "\n=====================================\n";
    cout << "         GENRE PREFERENCES\n";
    cout << "=====================================\n";

    cout << "Sci-Fi  : " << sciFiCount << endl;
    cout << "Horror  : " << horrorCount << endl;
    cout << "Action  : " << actionCount << endl;
    cout << "Romance : " << romanceCount << endl;
    cout << "Mystery : " << mysteryCount << endl;

    // Find highest genre count
    int highestCount = 0;

    if (sciFiCount > highestCount) {
        highestCount = sciFiCount;
    }

    if (horrorCount > highestCount) {
        highestCount = horrorCount;
    }

    if (actionCount > highestCount) {
        highestCount = actionCount;
    }

    if (romanceCount > highestCount) {
        highestCount = romanceCount;
    }

    if (mysteryCount > highestCount) {
        highestCount = mysteryCount;
    }

    // Display recommendation
    cout << "\n=====================================\n";
    cout << "         MOVIE RECOMMENDATION\n";
    cout << "=====================================\n";

    // Check if every selected movie belongs to a different genre
    bool allDifferent = true;

    if (sciFiCount > 1 ||
        horrorCount > 1 ||
        actionCount > 1 ||
        romanceCount > 1 ||
        mysteryCount > 1) {

        allDifferent = false;
    }

    // If every selected movie has a different genre
    if (allDifferent) {

        cout << "You selected different genres.\n";
        cout << "Here are your recommendations:\n\n";

        if (sciFiCount == 1) {
            cout << "Sci-Fi  : " << sciFiMovies[0] << endl;
        }

        if (horrorCount == 1) {
            cout << "Horror  : " << horrorMovies[0] << endl;
        }

        if (actionCount == 1) {
            cout << "Action  : " << actionMovies[0] << endl;
        }

        if (romanceCount == 1) {
            cout << "Romance : " << romanceMovies[0] << endl;
        }

        if (mysteryCount == 1) {
            cout << "Mystery : " << mysteryMovies[0] << endl;
        }
    }

    // Otherwise, recommend from the majority genre
    else {

        cout << "Your preferred genre is: ";

        if (sciFiCount == highestCount) {
            cout << "Sci-Fi" << endl;
            cout << "We recommend: "
                 << sciFiMovies[0] << endl;
        }
        else if (horrorCount == highestCount) {
            cout << "Horror" << endl;
            cout << "We recommend: "
                 << horrorMovies[0] << endl;
        }
        else if (actionCount == highestCount) {
            cout << "Action" << endl;
            cout << "We recommend: "
                 << actionMovies[0] << endl;
        }
        else if (romanceCount == highestCount) {
            cout << "Romance" << endl;
            cout << "We recommend: "
                 << romanceMovies[0] << endl;
        }
        else if (mysteryCount == highestCount) {
            cout << "Mystery" << endl;
            cout << "We recommend: "
                 << mysteryMovies[0] << endl;
        }
    }

    cout << "\nThank you for using Netflix Movie Recommender!\n";

    return 0;
}
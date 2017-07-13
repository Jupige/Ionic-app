import { Person } from "../model/person";
import { Injectable } from "@angular/core";
import { Subject } from "rxjs/Subject";

@Injectable()
export class AboutService {
    getPersionsAsync(): Subject<Person> {
        let subject = new Subject();
        let count = 0;
        let timmer = setInterval(() => {
            if (count >= 5) {
                subject.complete();
                subject.unsubscribe();
                subject = null;
                clearInterval(timmer);
                timmer = null;

                return;
            }

            subject.next(Person.generate());
        }, 1000);


        return subject;
    }
}
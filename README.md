# icas-ontology

This is the unified ICAS ontology designed to describe the
abstraction of information-security related information as used
by performers on the DARPA ICAS project.

## Distribution

Distribution Statement “A” (Approved for Public Release,
Distribution Unlimited)

## License

Copyright (c) 2014-2016 Invincea Labs, LLC.

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

## A Brief Explanation of OWL and RDF

The unified ICAS ontology is a collection of
[OWL2](http://www.w3.org/TR/owl2-overview/) ontologies under the
`http://www.invincea.com/ontologies/icas/1.0/` namespace. Each
ontology covers a specific conceptual area; for instance all
information related to users and user accounts is captured in the
User ontology.

OWL2 is an ontology description language built on top of the
[Resource Description Framework (RDF)](http://www.w3.org/TR/rdf-primer/).
RDF describes a way of storing data that is different from the
traditional table-based conception. RDF data consists of triples,
and only triples; each triple, called a *statement* consists of a
*subject*, *predicate*, and an *object*.

The *subject* represents a resource of some kind, the *predicate*
a relation, and the *object* can either be a literal value or
another resource.

OWL2 and the [RDF Schema (RDFS)](http://www.w3.org/TR/rdf-schema/)
define a set of resources and properties that can be used to
develop ontologies for RDF datasets.

### Examples

This section contains some annotated excerpts from the ontologies
as examples of how to read RDF and OWL. These examples are
encoded in the [Terse RDF Triple Langauge (Turtle)] (http://www.w3.org/TeamSubmission/turtle/),
just like the ICAS ontology. This is intended only as an
overview and omits many details

##### Turtle Primer

Recall that RDF consists only of *statements*, each of which is
composed of a *subject*, a *predicate*, and an *object*. In
the Turtle encoding, there is a shorthand creating multiple
statements that uses the `;` to indicate continuation with the
same *subject*. The following example shows how to interpret this
syntax.

``` turtle
<subject> <predicate> <object> ;
            <predicate> <object> .

<subject-2> <predicate-2> <object-2> .
```

##### UserAccount Class

This example depicts the UserAccount class from the User
ontology. It contains five statements in the Turtle syntax,
all of which share  `:UserAccount` as the subject.

``` turtle
:UserAccount a owl:Class ;
    rdfs:comment "an individual set of credentials."@en ;
    rdfs:label "User"@en ;
    rdfs:subClassOf owl:Thing .
```

The first statement `:UserAccount a owl:Class` states that
`:UserAccount` has the type `owl:Class`. `owl:Class` is used to
define types of resources.

The next two statements provide labels and comments - essentially
annotations - a about `:UserAccount`. The third statement is
standard and simply indicates that a `:UserAccount` is something
that exists in the world

##### Datatype Property

Datatype Properties describe the types of literal information
that can be represented and connected to resources. The following
excerpt describes the `:hasFullName` property, which represents
the concept of a user's display name.

``` turtle
:hasFullName
    a owl:DatatypeProperty ;
    rdfs:comment "and extended name or description, used only for display purposes"@en ;
    rdfs:label "has full name"@en ;
    rdfs:domain :UserAccount ;
    rdfs:range xsd:string .
```

The first statement is similar to what we saw before, but this
time it indicates that `:hasFullName` is a DatatypeProperty.  The
comment and label fulfill the same role as in the prior example.

The last two statements `:hasFullName rdfs:domain :UserAccount`
and `:hasFullName rdfs:range xsd:string` represent constraints on
this property. The former states that only `:UserAccounts` may be
the *subject* of this property. The latter says that the literal
object value of this property must be of type string.


##### Object Property

Object Properties describe relationships between resources.
The example below captures the notion of group membership for users
in computing systems. Note the use of `rdfs:domain` and
`rdfs:range` to constrain the valid *subject* and *objects* for
this *predicate*.

``` turtle
:memberOfGroup
    a owl:ObjectProperty ;
    rdfs:domain :UserAccount ;
    rdfs:label "is member of Group"@en ;
    rdfs:range :Group ;
```

## File Structure

Each of these sub-ontologies is written to a separate file that
shares the same name as the ontology using the
[Terse RDF Triple Langauge (Turtle)] (http://www.w3.org/TeamSubmission/turtle/)
encoding.  Thus, the User ontology can
be found in user.ttl and the Authentication ontology can be found
in authentication.ttl.

Although each file focuses on a specific set of concepts, they
are not isolated. At the top of each file, a series of namespaces
describe other ontologies from which that sub-ontology uses concepts.


## Tools for Reading OWL2 Ontology Files

While OWL2 ontology files are human readable, the Semantic Web
community has also developed a wide variety of GUI based tools
that can be used to read and edit ontology files. Links to a
selection of these tools can be found on the [Semantic Web
Wiki](http://semanticweb.org/wiki/Category:Ontology_editor)




